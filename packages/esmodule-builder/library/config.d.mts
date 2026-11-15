export declare enum CompilerKind {
    TypeScript = "typescript",
    Babel = "babel"
}
export declare enum SourceMapKind {
    None = "none",
    File = "file",
    Inline = "inline"
}
export declare type Config = {
    version: string;
    compiler: CompilerKind;
    source: {
        directory: string;
        entry: string;
        include: string[];
        exclude: string[];
    };
    module: {
        directory: string;
        name: string;
        sourceMap: SourceMapKind;
    };
    debug: {
        outputSource?: string;
    };
    typescript: {
        compilerOptions: {};
    };
    babel: {};
};
export declare const FILENAME = "esmconfig.json";
declare function parse(image: string): Config;
export default parse;
