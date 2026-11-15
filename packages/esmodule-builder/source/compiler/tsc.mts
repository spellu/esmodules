
import { Config, SourceMapKind } from '../config.mjs'
import { Project } from '../project.mjs'
import P from '../platform.mjs'
import meta from '../meta.mjs'
import log from 'npmlog'
import type TS from 'typescript'



let ts: typeof TS



const defaultCompilerOptions = {
	target: 'esnext',
	//lib: ['esnext'],
	module: 'esnext',
	moduleResolution: 'node',
	esModuleInterop: true,
	strict: true,
	alwaysStrict: true,
	declaration: true,
}



type Output = {
	module: string
	moduleMap?: string
	declaration: string
	declarationMap?: string
}

type TranspileResult = Output & TS.EmitResult

async function build(
	project: Project,
): Promise<void> {
	if (!ts) {
		try {
			ts = (await import('typescript')).default
		}
		catch (error) {
			throw new Error('Need installing "typescript".')
		}
	}

	const sourcePath = project.modulePathWithoutExtension + '.ts'

	const sourceText = project.sourceMap.wholeContent()

	const compilerOptions = {
		/* default compilerOptions */
		...defaultCompilerOptions,

		/* project compilerOptions */
		...{
			sourceMap: project.config.module.sourceMap != SourceMapKind.None,
			declarationMap: project.config.module.sourceMap != SourceMapKind.None,
		},

		/* custom compilerOptions */
		...project.config.typescript.compilerOptions,
	}

	if (project.config.debug.outputSource) {
		P.writeFile(
			P.joinPath(project.baseDirectoryPath, project.config.debug.outputSource, 'module.ts'),
			sourceText,
		)
		P.writeFile(
			P.joinPath(project.baseDirectoryPath, project.config.debug.outputSource, 'tsconfig.json'),
			createTSConfigImage(project.config, compilerOptions),
		)
	}

	const parsed = parseConfig(project, [sourcePath], compilerOptions)

	if (parsed.errors.length > 0) {
		displayDiagnostics(project, parsed.errors)
		return
	}

	if (parsed.options.locale) {
		ts.validateLocaleAndSetLanguage(parsed.options.locale, ts.sys, parsed.errors)
	}

	const result = await transpileModule(
		project,
		parsed.options,
		ts.createSourceFile(sourcePath, sourceText, parsed.options.target!),
	)

	log.silly('tsc', result.toString())

	displayDiagnostics(project, result.diagnostics)

	const errorOccurred = result.diagnostics.length > 0

	if (result.diagnostics.length == 0) {
		if (project.config.module.sourceMap == SourceMapKind.None) {
			writeFile(project, '.mjs', result.module)
			writeFile(project, '.d.ts', result.declaration)
		}
		else {
			const moduleMap = await project.sourceMap.originalSourceMap(JSON.parse(result.moduleMap!))

			moduleMap.file = moduleMap.file.replace(/\.js$/, '.mjs')

			switch (project.config.module.sourceMap) {
				case SourceMapKind.File:
					result.module += project.sourceMap.createFileComment(moduleMap)
					break
				case SourceMapKind.Inline:
					result.module += project.sourceMap.createInlineComment(moduleMap)
					break
			}

			const declarationMap = await project.sourceMap.originalSourceMap(JSON.parse(result.declarationMap!))

			switch (project.config.module.sourceMap) {
				case SourceMapKind.File:
					result.declaration += project.sourceMap.createFileComment(declarationMap)
					break
				case SourceMapKind.Inline:
					result.declaration += project.sourceMap.createInlineComment(declarationMap)
					break
			}

			writeFile(project, '.mjs', result.module)
			writeFile(project, '.d.ts', result.declaration)

			if (project.config.module.sourceMap == SourceMapKind.File) {
				writeFile(project, '.mjs.map', JSON.stringify(moduleMap))
				writeFile(project, '.d.ts.map', JSON.stringify(declarationMap))
			}

			const exitCode = errorOccurred ? 1 : 0
			log.silly('tsc', `Process exiting with code '${exitCode}'.`)
		}
	}
}

function createTSConfigImage(
	esmc: Config,
	compilerOptions: {},
): string {
	const config = {
		compilerOptions,
		include: esmc.source.include,
		exclude: esmc.source.exclude,
	}

	return JSON.stringify(config, null, '\t')
}

function parseConfig(
	project: Project,
	sources: string[],
	compilerOptions: {},
): TS.ParsedCommandLine {
	const host: TS.ParseConfigHost = {
		useCaseSensitiveFileNames: false,
		readDirectory: (rootDir: string, extensions: ReadonlyArray<string>, excludes: ReadonlyArray<string> | undefined, includes: ReadonlyArray<string>, depth?: number): string[] => sources,
		fileExists: (path: string): boolean => P.testFileExists(path),
		readFile: (path: string): string | undefined => P.readFile(path),
	}

	return ts.parseJsonConfigFileContent({ include: sources, compilerOptions }, host, project.baseDirectoryPath)
}

async function transpileModule(
	project: Project,
	options: TS.CompilerOptions,
	sourceFile: TS.SourceFile,
): Promise<TranspileResult> {
	const output: Output = {
		module: '',
		declaration: '',
	}

	const compilerHost = ts.createCompilerHost(options)

	const getSourceFileBase = compilerHost.getSourceFile

	compilerHost.getSourceFile =
		(fileName, languageVersion, onError, shouldCreateNewSourceFile) =>
			fileName === sourceFile.fileName
				? sourceFile
				: getSourceFileBase(fileName, languageVersion, onError, shouldCreateNewSourceFile)

	compilerHost.writeFile = async (fileName, text) => {
		if (fileName.endsWith('.js')) {
			// Quick Fix: import 'xx' -> import 'xx.mjs'
			const sourceDir = project.moduleDirectoryPath

			text = text.replace(/^\s*(import\s.+)(?:'(.*?)'|"(.*?)")/gm, ($0, $1, $2, $3) => {
				const path = P.joinPath(sourceDir, ($2 || $3) + '.mjs')
				return P.testFileExists(path) ? `${$1}'${$2 || $3}.mjs'` : $0
			})

			text = text.replace(/\/\/#\ssourceMappingURL=.+$/, '')

			output.module = text
		}
		else if (fileName.endsWith('.d.ts')) {
			text = text.replace(/\/\/#\ssourceMappingURL=.+$/, '')

			output.declaration = text
		}
		else if (fileName.endsWith('.js.map')) {
			output.moduleMap = text
		}
		else if (fileName.endsWith('.d.ts.map')) {
			output.declarationMap = text
		}
		else {
			log.warn('esmc', 'Unknown generated file.')
		}
	}

	const program = ts.createProgram([sourceFile.fileName], options, compilerHost)

	const emitResult = program.emit()

	emitResult.diagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics)

	return {
		...output,
		...emitResult,
	}
}

function writeFile(
	project: Project,
	extension: string,
	text: string,
) {
	const path = P.resolvePath(project.modulePathWithoutExtension + extension)

	P.writeFile(path, text)

	log.info(meta.program, `'${path}' generated.`)
}

function displayDiagnostics(
	project: Project,
	diagnostics: ReadonlyArray<TS.Diagnostic>,
) {
	diagnostics.forEach(diagnostic => {
		const loglevel = toLogLevel(diagnostic.category)

		const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')

		if (diagnostic.file) {
			const { line: lineOfModule, character: column } = diagnostic.file.getLineAndCharacterOfPosition(
				diagnostic.start!
			)

			if (diagnostic.file.fileName == (project.modulePathWithoutExtension + '.ts')) {
				const { path, line } = project.sourceMap.getLocation(lineOfModule)

				const location = `${path} (${line + 1},${column + 1})`
				log.log(loglevel, 'tsc', `${location}: ${message}`)
			}
			else {
				const path = P.relativePath(project.baseDirectoryPath, diagnostic.file.fileName)
				const line = lineOfModule

				const location = `${path} (${line + 1},${column + 1})`
				log.log(loglevel, 'tsc', `${location}: ${message}`)
			}
		}
		else {
			log.log(loglevel, 'tsc', message)
		}
	})

	function toLogLevel(
		category: TS.DiagnosticCategory,
	): string {
		switch (category) {
			case ts.DiagnosticCategory.Warning:
				return 'warn'
			case ts.DiagnosticCategory.Error:
				return 'error'
			case ts.DiagnosticCategory.Suggestion:
				return 'info'
			case ts.DiagnosticCategory.Message:
				return 'notice'
		}
	}
}

// function getNewLineCharacter(options: ts.CompilerOptions | ts.PrinterOptions): string {
//     const carriageReturnLineFeed = '\r\n';
//     const lineFeed = '\n';
//     switch (options.newLine) {
//         case ts.NewLineKind.CarriageReturnLineFeed:
//             return carriageReturnLineFeed;
//         case ts.NewLineKind.LineFeed:
//             return lineFeed;
//     }
//     return require('os').EOL;
// }

export default {
	build,
}
