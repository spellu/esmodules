declare type Program = {
    configFilePath: string;
    logLevel?: string;
};
declare function processCommandLine(args: string[]): Program;
declare function run(program: Program): Promise<boolean>;
declare const _default: {
    processCommandLine: typeof processCommandLine;
    run: typeof run;
};
export default _default;
