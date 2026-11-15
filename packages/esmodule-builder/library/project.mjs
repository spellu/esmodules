import meta from './meta.mjs';
import parseConfig from './config.mjs';
import SourceMap from './sourcemap.mjs';
import P from './platform.mjs';
import tsc from './compiler/tsc.mjs';
import babel from './compiler/babel.mjs';
import chalk from 'chalk';
import log from 'npmlog';
import glob from 'glob';
export default {
    load,
    build,
};
export function load(configFilePath, baseDirectoryPath = P.extractDirectoryPath(configFilePath)) {
    const text = P.readFile(configFilePath);
    const config = parseConfig(text);
    const entryPath = P.resolvePath(baseDirectoryPath, config.source.directory, config.source.entry);
    if (!P.testFileExists(entryPath)) {
        log.error(meta.program, chalk.red('Source file not found:'), chalk.white.bgRed(entryPath));
        throw new Error();
    }
    const codePaths = expandFilePatterns(baseDirectoryPath, config);
    const sourceMap = createSourceMap(entryPath, codePaths);
    return {
        baseDirectoryPath,
        configFilePath,
        config,
        entryPath,
        codePaths,
        moduleDirectoryPath: config.module.directory,
        modulePathWithoutExtension: P.resolvePath(baseDirectoryPath, config.module.directory, config.module.name),
        sourceMap,
    };
}
function expandFilePatterns(directoryPath, config) {
    const result = [];
    const excludePaths = [];
    for (let pattern of config.source.exclude) {
        const matches = glob.sync(P.resolvePath(directoryPath, config.source.directory, pattern));
        excludePaths.push(...matches);
    }
    for (let pattern of config.source.include) {
        // Add suffix '.ts'
        if (pattern.endsWith('/')) {
            pattern = pattern + '*.ts';
        }
        else if (pattern.endsWith('*')) {
            pattern = pattern + '.ts';
        }
        // const matches = glob.sync(fs.realpathSync(directoryPath) + '/' + pattern)
        const matches = glob.sync(P.resolvePath(directoryPath, config.source.directory, pattern));
        for (const match of matches) {
            // exclude ${source.entry} file
            if (match == P.resolvePath(directoryPath, config.source.directory, config.source.entry))
                continue;
            // exclude ${exclude} pattern
            if (excludePaths.indexOf(match) != -1)
                continue;
            result.push(P.normalizePath(match));
        }
    }
    return result;
}
function createSourceMap(entryPath, codePaths) {
    const sourceMap = new SourceMap();
    let afterPartLineIndex = 0;
    const lines = readFile(entryPath);
    for (let index = 0; index < lines.length; ++index) {
        const line = lines[index];
        const match = line.match(/^\s*\/\/\/\s*<\s*source\s*\/>/);
        if (match) {
            // 1. before part
            sourceMap.addSource(entryPath, lines.slice(0, index), 1);
            afterPartLineIndex = index + 1;
            // 2. source part
            for (const path of codePaths) {
                const lines = readFile(path);
                const count = lines.length;
                sourceMap.addSource(path, lines, 1);
            }
            break;
        }
    }
    // 3. after part
    sourceMap.addSource(entryPath, lines.slice(afterPartLineIndex), 1 + afterPartLineIndex);
    return sourceMap;
}
function readFile(path) {
    const content = P.readFile(path);
    return (content.match(/[\n]$/g) ? content.substring(0, content.length - 1) : content)
        .split(/\r\n|\n/);
}
export async function build(project) {
    switch (project.config.compiler) {
        case 'typescript':
            await tsc.build(project);
            break;
        case 'babel':
            await babel.build(project);
            break;
        default:
            log.error(meta.program, 'Invalid compiler specified.');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvamVjdC5tanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zb3VyY2UvcHJvamVjdC5tdHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxJQUFJLE1BQU0sWUFBWSxDQUFBO0FBQzdCLE9BQU8sV0FBdUIsTUFBTSxjQUFjLENBQUE7QUFDbEQsT0FBTyxTQUFTLE1BQU0saUJBQWlCLENBQUE7QUFDdkMsT0FBTyxDQUFDLE1BQU0sZ0JBQWdCLENBQUE7QUFDOUIsT0FBTyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDcEMsT0FBTyxLQUFLLE1BQU0sc0JBQXNCLENBQUE7QUFDeEMsT0FBTyxLQUFLLE1BQU0sT0FBTyxDQUFBO0FBQ3pCLE9BQU8sR0FBRyxNQUFNLFFBQVEsQ0FBQTtBQUN4QixPQUFPLElBQUksTUFBTSxNQUFNLENBQUE7QUFFdkIsZUFBZTtJQUNkLElBQUk7SUFDSixLQUFLO0NBQ0wsQ0FBQTtBQWFELE1BQU0sVUFBVSxJQUFJLENBQ25CLGNBQXNCLEVBQ3RCLG9CQUE0QixDQUFDLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDO0lBRWxFLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLENBQUE7SUFFdkMsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBRWhDLE1BQU0sU0FBUyxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUMsaUJBQWlCLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUVoRyxJQUFJLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsRUFBRTtRQUNqQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFNB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