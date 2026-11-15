
import { Config, SourceMapKind } from '../config.mjs'
import { Project } from '../project.mjs'
import P from '../platform.mjs'
import meta from '../meta.mjs'
import log from 'npmlog'
import type BABEL from '@babel/core'


const DEFAULT_BABEL_CONFIG = {
	presets: [
		[
			'@babel/preset-env',
			{ targets: { 'node': 'current' }, modules: false },
		],
	],

	plugins: [],
}



let babel: typeof BABEL



async function build(
	project: Project,
): Promise<void> {
	if (!babel) {
		try {
			babel = await import('@babel/core')
		}
		catch (error) {
			throw new Error('Need installing "@babel/core".')
		}
	}

	const sourcePath = project.modulePathWithoutExtension + '.js'

	const sourceText = project.sourceMap.wholeContent()

	const options: BABEL.TransformOptions = {
		/* default compilerOptions */
		...DEFAULT_BABEL_CONFIG,

		/* project compilerOptions */
		...{
			// include: project.sourceMap.sources().map(_ => _.path),
			sourceMap: project.config.module.sourceMap != SourceMapKind.None,
		},

		/* custom compilerOptions */
		...project.config.babel,
	}

	options.presets = (options.presets || []).map(preset => {
		const envOptions = { modules: false }

		if (typeof preset == 'string') {
			preset = normalizePresetName(preset)

			if (testNameIsPresetEnv(preset)) {
				return ['@babel/preset-env', envOptions]
			}
		}
		else if (Array.isArray(preset) && preset.length >= 1) {
			preset[0] = normalizePresetName(preset[0])

			if (testNameIsPresetEnv(preset[0])) {
				return ['@babel/preset-env', { ...preset[1] ?? {}, ...envOptions }]
			}
		}

		return preset

		function normalizePresetName(name: any): any {
			if (typeof name == 'string') {
				if (name.match(/^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/)) name = '@babel/preset-' + name
			}
			return name
		}

		function testNameIsPresetEnv(name: any): boolean {
			if (name === '@babel/preset-env') return true
			return false
		}
	})

	if (project.config.debug.outputSource) {
		P.writeFile(
			P.joinPath(project.baseDirectoryPath, project.config.debug.outputSource, 'module.js'),
			sourceText,
		)
		P.writeFile(
			P.joinPath(project.baseDirectoryPath, project.config.debug.outputSource, 'babel.config.json'),
			JSON.stringify(options, null, '\t')
		)
	}

	try {
		const result = babel.transformSync(sourceText, options)

		if (!result) {
			throw new Error('transform failed.')
		}

		if (result.code) {
			if (project.config.module.sourceMap == SourceMapKind.None) {
				writeFile(project, '.mjs', result.code)
			}
			else {
				const moduleMap = await project.sourceMap.originalSourceMap(result.map!)

				moduleMap.file = P.extractFileTitlePath(project.modulePathWithoutExtension) + '.js'

				switch (project.config.module.sourceMap) {
					case SourceMapKind.File:
						result.code += '\n' + project.sourceMap.createFileComment(moduleMap)
						break
					case SourceMapKind.Inline:
						result.code += '\n' + project.sourceMap.createInlineComment(moduleMap)
						break
				}

				writeFile(project, '.mjs', result.code)
				if (project.config.module.sourceMap == SourceMapKind.File) {
					writeFile(project, '.mjs.map', JSON.stringify(moduleMap))
				}
			}
		}
	}
	catch (error) {
		displayError(project, error)

		throw error
	}
}

function writeFile(
	project: Project,
	extension: string,
	text: string,
): void {
	const path = P.resolvePath(project.modulePathWithoutExtension + extension)

	P.writeFile(path, text)

	log.info(meta.program, `'${path}' generated.`)
}

function displayError(
	project: Project,
	error: any,
): void {
	switch (error.code) {
		case 'BABEL_PARSE_ERROR':
			const d = parseBabelParseError(error)

			const { path, line } = project.sourceMap.getLocation(d.line)

			const location = `${path} (${line},${d.column + 1})`
			log.error('babel', `${location}: ${d.message}`)

			if (d.additionalMessage) {
				log.notice('babel', d.additionalMessage)
			}
			break

		default:
			log.error('babel', error.message)
	}
}

interface Diagnostic {
	source: string
	line: number
	column: number
	message: string
	additionalMessage: string
}

function parseBabelParseError(
	error: any,
): Diagnostic {
	// console.log(error.loc, error.pos, error.code, error.message)

	const result = error.message.match(/^(.*?):(.+)\(\d+:\d+\):?\n(.*)$/sm);

	return {
		source: result ? result[1] : '',
		line: error.loc.line,
		column: error.loc.column,
		message: result ? result[2].trim() : error.message,
		additionalMessage: result ? result[3] : '',
	}
}



export default {
	build,
}