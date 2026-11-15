import { Config } from './config.mjs';
import SourceMap from './sourcemap.mjs';
declare const _default: {
    load: typeof load;
    build: typeof build;
};
export default _default;
export declare type Project = {
    baseDirectoryPath: string;
    configFilePath?: string;
    config: Config;
    entryPath: string;
    codePaths: string[];
    moduleDirectoryPath: string;
    modulePathWithoutExtension: string;
    sourceMap: SourceMap;
};
export declare function load(configFilePath: string, baseDirectoryPath?: string): Project;
export declare function build(project: Project): Promise<void>;
