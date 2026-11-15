import { SourceMapKind } from '../config.mjs';
import P from '../platform.mjs';
import meta from '../meta.mjs';
import log from 'npmlog';
let ts;
const defaultCompilerOptions = {
    target: 'esnext',
    //lib: ['esnext'],
    module: 'esnext',
    moduleResolution: 'node',
    esModuleInterop: true,
    strict: true,
    alwaysStrict: true,
    declaration: true,
};
async function build(project) {
    if (!ts) {
        try {
            ts = (await import('typescript')).default;
        }
        catch (error) {
            throw new Error('Need installing "typescript".');
        }
    }
    const sourcePath = project.modulePathWithoutExtension + '.ts';
    const sourceText = project.sourceMap.wholeContent();
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
    };
    if (project.config.debug.outputSource) {
        P.writeFile(P.joinPath(project.baseDirectoryPath, project.config.debug.outputSource, 'module.ts'), sourceText);
        P.writeFile(P.joinPath(project.baseDirectoryPath, project.config.debug.outputSource, 'tsconfig.json'), createTSConfigImage(project.config, compilerOptions));
    }
    const parsed = parseConfig(project, [sourcePath], compilerOptions);
    if (parsed.errors.length > 0) {
        displayDiagnostics(project, parsed.errors);
        return;
    }
    if (parsed.options.locale) {
        ts.validateLocaleAndSetLanguage(parsed.options.locale, ts.sys, parsed.errors);
    }
    const result = await transpileModule(project, parsed.options, ts.createSourceFile(sourcePath, sourceText, parsed.options.target));
    log.silly('tsc', result.toString());
    displayDiagnostics(project, result.diagnostics);
    const errorOccurred = result.diagnostics.length > 0;
    if (result.diagnostics.length == 0) {
        if (project.config.module.sourceMap == SourceMapKind.None) {
            writeFile(project, '.mjs', result.module);
            writeFile(project, '.d.ts', result.declaration);
        }
        else {
            const moduleMap = await project.sourceMap.originalSourceMap(JSON.parse(result.moduleMap));
            moduleMap.file = moduleMap.file.replace(/\.js$/, '.mjs');
            switch (project.config.module.sourceMap) {
                case SourceMapKind.File:
                    result.module += project.sourceMap.createFileComment(moduleMap);
                    break;
                case SourceMapKind.Inline:
                    result.module += project.sourceMap.createInlineComment(moduleMap);
                    break;
            }
            const declarationMap = await project.sourceMap.originalSourceMap(JSON.parse(result.declarationMap));
            switch (project.config.module.sourceMap) {
                case SourceMapKind.File:
                    result.declaration += project.sourceMap.createFileComment(declarationMap);
                    break;
                case SourceMapKind.Inline:
                    result.declaration += project.sourceMap.createInlineComment(declarationMap);
                    break;
            }
            writeFile(project, '.mjs', result.module);
            writeFile(project, '.d.ts', result.declaration);
            if (project.config.module.sourceMap == SourceMapKind.File) {
                writeFile(project, '.mjs.map', JSON.stringify(moduleMap));
                writeFile(project, '.d.ts.map', JSON.stringify(declarationMap));
            }
            const exitCode = errorOccurred ? 1 : 0;
            log.silly('tsc', `Process exiting with code '${exitCode}'.`);
        }
    }
}
function createTSConfigImage(esmc, compilerOptions) {
    const config = {
        compilerOptions,
        include: esmc.source.include,
        exclude: esmc.source.exclude,
    };
    return JSON.stringify(config, null, '\t');
}
function parseConfig(project, sources, compilerOptions) {
    const host = {
        useCaseSensitiveFileNames: false,
        readDirectory: (rootDir, extensions, excludes, includes, depth) => sources,
        fileExists: (path) => P.testFileExists(path),
        readFile: (path) => P.readFile(path),
    };
    return ts.parseJsonConfigFileContent({ include: sources, compilerOptions }, host, project.baseDirectoryPath);
}
async function transpileModule(project, options, sourceFile) {
    const output = {
        module: '',
        declaration: '',
    };
    const compilerHost = ts.createCompilerHost(options);
    const getSourceFileBase = compilerHost.getSourceFile;
    compilerHost.getSourceFile =
        (fileName, languageVersion, onError, shouldCreateNewSourceFile) => fileName === sourceFile.fileName
            ? sourceFile
            : getSourceFileBase(fileName, languageVersion, onError, shouldCreateNewSourceFile);
    compilerHost.writeFile = async (fileName, text) => {
        if (fileName.endsWith('.js')) {
            // Quick Fix: import 'xx' -> import 'xx.mjs'
            const sourceDir = project.moduleDirectoryPath;
            text = text.replace(/^\s*(import\s.+)(?:'(.*?)'|"(.*?)")/gm, ($0, $1, $2, $3) => {
                const path = P.joinPath(sourceDir, ($2 || $3) + '.mjs');
                return P.testFileExists(path) ? `${$1}'${$2 || $3}.mjs'` : $0;
            });
            text = text.replace(/\/\/#\ssourceMappingURL=.+$/, '');
            output.module = text;
        }
        else if (fileName.endsWith('.d.ts')) {
            text = text.replace(/\/\/#\ssourceMappingURL=.+$/, '');
            output.declaration = text;
        }
        else if (fileName.endsWith('.js.map')) {
            output.moduleMap = text;
        }
        else if (fileName.endsWith('.d.ts.map')) {
            output.declarationMap = text;
        }
        else {
            log.warn('esmc', 'Unknown generated file.');
        }
    };
    const program = ts.createProgram([sourceFile.fileName], options, compilerHost);
    const emitResult = program.emit();
    emitResult.diagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
    return {
        ...output,
        ...emitResult,
    };
}
function writeFile(project, extension, text) {
    const path = P.resolvePath(project.modulePathWithoutExtension + extension);
    P.writeFile(path, text);
    log.info(meta.program, `'${path}' generated.`);
}
function displayDiagnostics(project, diagnostics) {
    diagnostics.forEach(diagnostic => {
        const loglevel = toLogLevel(diagnostic.category);
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
        if (diagnostic.file) {
            const { line: lineOfModule, character: column } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
            if (diagnostic.file.fileName == (project.modulePathWithoutExtension + '.ts')) {
                const { path, line } = project.sourceMap.getLocation(lineOfModule);
                const location = `${path} (${line + 1},${column + 1})`;
                log.log(loglevel, 'tsc', `${location}: ${message}`);
            }
            else {
                const path = P.relativePath(project.baseDirectoryPath, diagnostic.file.fileName);
                const line = lineOfModule;
                const location = `${path} (${line + 1},${column + 1})`;
                log.log(loglevel, 'tsc', `${location}: ${message}`);
            }
        }
        else {
            log.log(loglevel, 'tsc', message);
        }
    });
    function toLogLevel(category) {
        switch (category) {
            case ts.DiagnosticCategory.Warning:
                return 'warn';
            case ts.DiagnosticCategory.Error:
                return 'error';
            case ts.DiagnosticCategory.Suggestion:
                return 'info';
            case ts.DiagnosticCategory.Message:
                return 'notice';
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
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNjLm1qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NvdXJjZS9jb21waWxlci90c2MubXRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sRUFBVSxhQUFhLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFFckQsT0FBTyxDQUFDLE1BQU0saUJBQWlCLENBQUE7QUFDL0IsT0FBTyxJQUFJLE1BQU0sYUFBYSxDQUFBO0FBQzlCLE9BQU8sR0FBRyxNQUFNLFFBQVEsQ0FBQTtBQUt4QixJQUFJLEVBQWEsQ0FBQTtBQUlqQixNQUFNLHNCQUFzQixHQUFHO0lBQzlCLE1BQU0sRUFBRSxRQUFRO0lBQ2hCLGtCQUFrQjtJQUNsQixNQUFNLEVBQUUsUUFBUTtJQUNoQixnQkFBZ0IsRUFBRSxNQUFNO0lBQ3hCLGVBQWUsRUFBRSxJQUFJO0lBQ3JCLE1BQU0sRUFBRSxJQUFJO0lBQ1osWUFBWSxFQUFFLElBQUk7SUFDbEIsV0FBVyxFQUFFLElBQUk7Q0FDakIsQ0FBQTtBQWFELEtBQUssVUFBVSxLQUFLLENBQ25CLE9BQWdCO0lBRWhCLElBQUksQ0FBQyxFQUFFLEVBQUU7UUFDUixJQUFJO1lBQ0gsRUFBRSxHQUFHLENBQUMsTUFBTSxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUE7U0FDekM7UUFDRCxPQUFPLEtBQUssRUFBRTtZQUNiLE1BQU0sSUFBSSxLQUFLLENBQUMsK0JBQStCLENBQUMsQ0FBQTtTQUNoRDtLQUNEO0lBRUQsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLDBCQUEwQixHQUFHLEtBQUssQ0FBQTtJQUU3RCxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxDQUFBO0lBRW5ELE1BQU0sZUFBZSxHQUFHO1FBQ3ZCLDZCQUE2QjtRQUM3QixHQUFHLHNCQUFzQjtRQUV6Qiw2QkFBNkI7UUFDN0IsR0FBRztZQUNGLFNBQVMsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0s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