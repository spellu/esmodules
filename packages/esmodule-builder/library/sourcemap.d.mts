import { RawSourceMap } from '#source-map';
export interface Source {
    path: string;
    lines: string[];
    lineStartNo: number;
    lineCount: number;
}
export declare class SourceMap {
    addSource(path: string, lines: string[], lineStartNo?: number): void;
    sources(): Source[];
    wholeContent(): string;
    getLocation(wholeLineNo: number): {
        path: string;
        line: number;
    };
    originalSourceMap(wholeSourceMap: RawSourceMap): Promise<RawSourceMap>;
    createFileComment(sourceMap: RawSourceMap): string;
    createInlineComment(sourceMap: RawSourceMap): string;
    toString(): string;
    private _sources;
}
export default SourceMap;
