"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../config");
const platform_1 = __importDefault(require("../platform"));
const meta_1 = __importDefault(require("../meta"));
const npmlog_1 = __importDefault(require("npmlog"));
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
function build(project) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!ts) {
            try {
                ts = yield Promise.resolve().then(() => __importStar(require('typescript')));
            }
            catch (error) {
                throw new Error('Need installing "typescript".');
            }
        }
        const sourcePath = project.modulePathWithoutExtension + '.ts';
        const sourceText = project.sourceMap.wholeContent();
        const compilerOptions = Object.assign(Object.assign(Object.assign({}, defaultCompilerOptions), {
            sourceMap: project.config.module.sourceMap != config_1.SourceMapKind.None,
            declarationMap: project.config.module.sourceMap != config_1.SourceMapKind.None,
        }), project.config.typescript.compilerOptions);
        if (project.config.debug.outputSource) {
            platform_1.default.writeFile(platform_1.default.joinPath(project.baseDirectoryPath, project.config.debug.outputSource, 'module.ts'), sourceText);
            platform_1.default.writeFile(platform_1.default.joinPath(project.baseDirectoryPath, project.config.debug.outputSource, 'tsconfig.json'), createTSConfigImage(project.config, compilerOptions));
        }
        const parsed = parseConfig(project, [sourcePath], compilerOptions);
        if (parsed.errors.length > 0) {
            displayDiagnostics(project, parsed.errors);
            return;
        }
        if (parsed.options.locale) {
            ts.validateLocaleAndSetLanguage(parsed.options.locale, ts.sys, parsed.errors);
        }
        const result = yield transpileModule(project, parsed.options, ts.createSourceFile(sourcePath, sourceText, parsed.options.target));
        npmlog_1.default.silly('tsc', result.toString());
        displayDiagnostics(project, result.diagnostics);
        const errorOccurred = result.diagnostics.length > 0;
        if (result.diagnostics.length == 0) {
            if (project.config.module.sourceMap == config_1.SourceMapKind.None) {
                writeFile(project, '.mjs', result.module);
                writeFile(project, '.d.ts', result.declaration);
            }
            else {
                const moduleMap = yield project.sourceMap.originalSourceMap(JSON.parse(result.moduleMap));
                moduleMap.file = moduleMap.file.replace(/\.js$/, '.mjs');
                switch (project.config.module.sourceMap) {
                    case config_1.SourceMapKind.File:
                        result.module += project.sourceMap.createFileComment(moduleMap);
                        break;
                    case config_1.SourceMapKind.Inline:
                        result.module += project.sourceMap.createInlineComment(moduleMap);
                        break;
                }
                const declarationMap = yield project.sourceMap.originalSourceMap(JSON.parse(result.declarationMap));
                switch (project.config.module.sourceMap) {
                    case config_1.SourceMapKind.File:
                        result.declaration += project.sourceMap.createFileComment(declarationMap);
                        break;
                    case config_1.SourceMapKind.Inline:
                        result.declaration += project.sourceMap.createInlineComment(declarationMap);
                        break;
                }
                writeFile(project, '.mjs', result.module);
                writeFile(project, '.d.ts', result.declaration);
                if (project.config.module.sourceMap == config_1.SourceMapKind.File) {
                    writeFile(project, '.mjs.map', JSON.stringify(moduleMap));
                    writeFile(project, '.d.ts.map', JSON.stringify(declarationMap));
                }
                const exitCode = errorOccurred ? 1 : 0;
                npmlog_1.default.silly('tsc', `Process exiting with code '${exitCode}'.`);
            }
        }
    });
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
        fileExists: (path) => platform_1.default.testFileExists(path),
        readFile: (path) => platform_1.default.readFile(path),
    };
    return ts.parseJsonConfigFileContent({ include: sources, compilerOptions }, host, project.baseDirectoryPath);
}
function transpileModule(project, options, sourceFile) {
    return __awaiter(this, void 0, void 0, function* () {
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
        compilerHost.writeFile = (fileName, text) => __awaiter(this, void 0, void 0, function* () {
            if (fileName.endsWith('.js')) {
                // Quick Fix: import 'xx' -> import 'xx.mjs'
                const sourceDir = project.moduleDirectoryPath;
                text = text.replace(/^\s*(import\s.+)(?:'(.*?)'|"(.*?)")/gm, ($0, $1, $2, $3) => {
                    const path = platform_1.default.joinPath(sourceDir, ($2 || $3) + '.mjs');
                    return platform_1.default.testFileExists(path) ? `${$1}'${$2 || $3}.mjs'` : $0;
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
                npmlog_1.default.warn('esmc', 'Unknown generated file.');
            }
        });
        const program = ts.createProgram([sourceFile.fileName], options, compilerHost);
        const emitResult = program.emit();
        emitResult.diagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
        return Object.assign(Object.assign({}, output), emitResult);
    });
}
function writeFile(project, extension, text) {
    const path = platform_1.default.resolvePath(project.modulePathWithoutExtension + extension);
    platform_1.default.writeFile(path, text);
    npmlog_1.default.info(meta_1.default.program, `'${path}' generated.`);
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
                npmlog_1.default.log(loglevel, 'tsc', `${location}: ${message}`);
            }
            else {
                const path = platform_1.default.relativePath(project.baseDirectoryPath, diagnostic.file.fileName);
                const line = lineOfModule;
                const location = `${path} (${line + 1},${column + 1})`;
                npmlog_1.default.log(loglevel, 'tsc', `${location}: ${message}`);
            }
        }
        else {
            npmlog_1.default.log(loglevel, 'tsc', message);
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
exports.default = {
    build,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NvbXBpbGVycy90c2MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0Esc0NBQWlEO0FBRWpELDJEQUEyQjtBQUMzQixtREFBMEI7QUFDMUIsb0RBQXdCO0FBS3hCLElBQUksRUFBYSxDQUFBO0FBSWpCLE1BQU0sc0JBQXNCLEdBQUc7SUFDOUIsTUFBTSxFQUFFLFFBQVE7SUFDaEIsa0JBQWtCO0lBQ2xCLE1BQU0sRUFBRSxRQUFRO0lBQ2hCLGdCQUFnQixFQUFFLE1BQU07SUFDeEIsZUFBZSxFQUFFLElBQUk7SUFDckIsTUFBTSxFQUFFLElBQUk7SUFDWixZQUFZLEVBQUUsSUFBSTtJQUNsQixXQUFXLEVBQUUsSUFBSTtDQUNqQixDQUFBO0FBYUQsU0FBZSxLQUFLLENBQ25CLE9BQWdCOztRQUVoQixJQUFJLENBQUMsRUFBRSxFQUFFO1lBQ1IsSUFBSTtnQkFDSCxFQUFFLEdBQUcsd0RBQWEsWUFBWSxHQUFDLENBQUE7YUFDL0I7WUFDRCxPQUFPLEtBQUssRUFBRTtnQkFDYixNQUFNLElBQUksS0FBSyxDQUFDLCtCQUErQixDQUFDLENBQUE7YUFDaEQ7U0FDRDtRQUVELE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQywwQkFBMEIsR0FBRyxLQUFLLENBQUE7UUFFN0QsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUVuRCxNQUFNLGVBQWUsaURBRWpCLHNCQUFzQixHQUd0QjtZQUNGLFNBQVMsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLElBQUksc0JBQWEsQ0FBQyxJQUFJO1lBQ2hFLGNBQWMsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLElBQUksc0JBQWEsQ0FBQyxJQUFJO1NBQ3JFLEdBR0UsT0FBTyxDQUFDLE1B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