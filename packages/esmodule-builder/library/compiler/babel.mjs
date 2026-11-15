import { SourceMapKind } from '../config.mjs';
import P from '../platform.mjs';
import meta from '../meta.mjs';
import log from 'npmlog';
const DEFAULT_BABEL_CONFIG = {
    presets: [
        [
            '@babel/preset-env',
            { targets: { 'node': 'current' }, modules: false },
        ],
    ],
    plugins: [],
};
let babel;
async function build(project) {
    if (!babel) {
        try {
            babel = await import('@babel/core');
        }
        catch (error) {
            throw new Error('Need installing "@babel/core".');
        }
    }
    const sourcePath = project.modulePathWithoutExtension + '.js';
    const sourceText = project.sourceMap.wholeContent();
    const options = {
        /* default compilerOptions */
        ...DEFAULT_BABEL_CONFIG,
        /* project compilerOptions */
        ...{
            // include: project.sourceMap.sources().map(_ => _.path),
            sourceMap: project.config.module.sourceMap != SourceMapKind.None,
        },
        /* custom compilerOptions */
        ...project.config.babel,
    };
    options.presets = (options.presets || []).map(preset => {
        const envOptions = { modules: false };
        if (typeof preset == 'string') {
            preset = normalizePresetName(preset);
            if (testNameIsPresetEnv(preset)) {
                return ['@babel/preset-env', envOptions];
            }
        }
        else if (Array.isArray(preset) && preset.length >= 1) {
            preset[0] = normalizePresetName(preset[0]);
            if (testNameIsPresetEnv(preset[0])) {
                return ['@babel/preset-env', { ...preset[1] ?? {}, ...envOptions }];
            }
        }
        return preset;
        function normalizePresetName(name) {
            if (typeof name == 'string') {
                if (name.match(/^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/))
                    name = '@babel/preset-' + name;
            }
            return name;
        }
        function testNameIsPresetEnv(name) {
            if (name === '@babel/preset-env')
                return true;
            return false;
        }
    });
    if (project.config.debug.outputSource) {
        P.writeFile(P.joinPath(project.baseDirectoryPath, project.config.debug.outputSource, 'module.js'), sourceText);
        P.writeFile(P.joinPath(project.baseDirectoryPath, project.config.debug.outputSource, 'babel.config.json'), JSON.stringify(options, null, '\t'));
    }
    try {
        const result = babel.transformSync(sourceText, options);
        if (!result) {
            throw new Error('transform failed.');
        }
        if (result.code) {
            if (project.config.module.sourceMap == SourceMapKind.None) {
                writeFile(project, '.mjs', result.code);
            }
            else {
                const moduleMap = await project.sourceMap.originalSourceMap(result.map);
                moduleMap.file = P.extractFileTitlePath(project.modulePathWithoutExtension) + '.js';
                switch (project.config.module.sourceMap) {
                    case SourceMapKind.File:
                        result.code += '\n' + project.sourceMap.createFileComment(moduleMap);
                        break;
                    case SourceMapKind.Inline:
                        result.code += '\n' + project.sourceMap.createInlineComment(moduleMap);
                        break;
                }
                writeFile(project, '.mjs', result.code);
                if (project.config.module.sourceMap == SourceMapKind.File) {
                    writeFile(project, '.mjs.map', JSON.stringify(moduleMap));
                }
            }
        }
    }
    catch (error) {
        displayError(project, error);
        throw error;
    }
}
function writeFile(project, extension, text) {
    const path = P.resolvePath(project.modulePathWithoutExtension + extension);
    P.writeFile(path, text);
    log.info(meta.program, `'${path}' generated.`);
}
function displayError(project, error) {
    switch (error.code) {
        case 'BABEL_PARSE_ERROR':
            const d = parseBabelParseError(error);
            const { path, line } = project.sourceMap.getLocation(d.line);
            const location = `${path} (${line},${d.column + 1})`;
            log.error('babel', `${location}: ${d.message}`);
            if (d.additionalMessage) {
                log.notice('babel', d.additionalMessage);
            }
            break;
        default:
            log.error('babel', error.message);
    }
}
function parseBabelParseError(error) {
    // console.log(error.loc, error.pos, error.code, error.message)
    const result = error.message.match(/^(.*?):(.+)\(\d+:\d+\):?\n(.*)$/sm);
    return {
        source: result ? result[1] : '',
        line: error.loc.line,
        column: error.loc.column,
        message: result ? result[2].trim() : error.message,
        additionalMessage: result ? result[3] : '',
    };
}
export default {
    build,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFiZWwubWpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL2NvbXBpbGVyL2JhYmVsLm10cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQVUsYUFBYSxFQUFFLE1BQU0sZUFBZSxDQUFBO0FBRXJELE9BQU8sQ0FBQyxNQUFNLGlCQUFpQixDQUFBO0FBQy9CLE9BQU8sSUFBSSxNQUFNLGFBQWEsQ0FBQTtBQUM5QixPQUFPLEdBQUcsTUFBTSxRQUFRLENBQUE7QUFJeEIsTUFBTSxvQkFBb0IsR0FBRztJQUM1QixPQUFPLEVBQUU7UUFDUjtZQUNDLG1CQUFtQjtZQUNuQixFQUFFLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFO1NBQ2xEO0tBQ0Q7SUFFRCxPQUFPLEVBQUUsRUFBRTtDQUNYLENBQUE7QUFJRCxJQUFJLEtBQW1CLENBQUE7QUFJdkIsS0FBSyxVQUFVLEtBQUssQ0FDbkIsT0FBZ0I7SUFFaEIsSUFBSSxDQUFDLEtBQUssRUFBRTtRQUNYLElBQUk7WUFDSCxLQUFLLEdBQUcsTUFBTSxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUE7U0FDbkM7UUFDRCxPQUFPLEtBQUssRUFBRTtZQUNiLE1BQU0sSUFBSSxLQUFLLENBQUMsZ0NBQWdDLENBQUMsQ0FBQTtTQUNqRDtLQUNEO0lBRUQsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLDBCQUEwQixHQUFHLEtBQUssQ0FBQTtJQUU3RCxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxDQUFBO0lBRW5ELE1BQU0sT0FBTyxHQUEyQjtRQUN2Qyw2QkFBNkI7UUFDN0IsR0FBRyxvQkFBb0I7UUFFdkIsNkJBQTZCO1FBQzdCLEdBQUc7WUFDRix5REFBeUQ7WUFDekQsU0FBUyxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsSUFBSSxhQUFhLENBQUMsSUFB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