import json5 from 'json5';
import P from './platform.mjs';
export var CompilerKind;
(function (CompilerKind) {
    CompilerKind["TypeScript"] = "typescript";
    CompilerKind["Babel"] = "babel";
})(CompilerKind = CompilerKind || (CompilerKind = {}));
export var SourceMapKind;
(function (SourceMapKind) {
    SourceMapKind["None"] = "none";
    SourceMapKind["File"] = "file";
    SourceMapKind["Inline"] = "inline";
})(SourceMapKind = SourceMapKind || (SourceMapKind = {}));
export const FILENAME = 'esmconfig.json';
const DEFAULT = {
    version: '1.0',
    compiler: CompilerKind.TypeScript,
    source: {
        directory: '.',
        entry: 'module.ts',
        include: ['**/*.ts'],
        exclude: [],
    },
    module: {
        directory: '.',
        name: 'module',
        sourceMap: SourceMapKind.None,
    },
    debug: {},
    typescript: {
        compilerOptions: {
            locale: (process.env.LANG ?? '').substring(0, 2),
        }
    },
    babel: {},
};
function parse(image) {
    const data = json5.parse(image);
    const choiseValue = function (defaultValue, specifiedValue, checker) {
        const value = specifiedValue || defaultValue;
        return checker ? checker(value) : value;
    };
    const choiseObject = function (defaultValue, specifiedValue) {
        return Object.assign({}, defaultValue, specifiedValue);
    };
    const version = choiseValue(DEFAULT.version, data.version);
    const compiler = choiseValue(DEFAULT.compiler, data.compiler, (value) => {
        const lowerValue = value.toLowerCase();
        if (value == 'typescript')
            return CompilerKind.TypeScript;
        if (value == 'babel')
            return CompilerKind.Babel;
        return CompilerKind.TypeScript;
    });
    const source = choiseValue(DEFAULT.source, data.source, value => {
        if (typeof value === 'string') {
            return {
                directory: '.',
                entry: value,
                include: ['**/*'],
                exclude: [],
            };
        }
        // TODO: check value.entry
        const include = choiseValue(DEFAULT.source.include, typeof value.include === 'string' ? [value.include] : value.include);
        const exclude = choiseValue(DEFAULT.source.exclude, typeof value.exclude === 'string' ? [value.exclude] : value.exclude);
        return {
            directory: value.directory || DEFAULT.source.directory,
            entry: value.entry,
            include,
            exclude,
        };
    });
    const module = choiseValue(DEFAULT.module, data.module, value => {
        if (typeof value === 'string') {
            return {
                directory: P.extractDirectoryPath(value),
                name: P.extractFileTitlePath(value),
                sourceMap: SourceMapKind.None,
            };
        }
        else if (typeof value === 'object') {
            // TODO: check value.name
            const sourceMap = choiseValue(DEFAULT.module.sourceMap, value.sourceMap, (value) => {
                const lowerValue = value.toLowerCase();
                if (value == 'file')
                    return SourceMapKind.File;
                if (value == 'inline')
                    return SourceMapKind.Inline;
                return SourceMapKind.None;
            });
            return {
                directory: value.directory || DEFAULT.module.directory,
                name: value.name,
                sourceMap: sourceMap,
            };
        }
        else if (typeof value === 'undefined') {
            // TODO Error handling
            console.log('Parameter "module" must need.');
            return { directory: '', name: '', sourceMap: SourceMapKind.None };
        }
        else {
            // TODO Error handling
            console.log('Parameter "module" must need.');
            return { directory: '', name: '', sourceMap: SourceMapKind.None };
        }
    });
    const debug = choiseObject(DEFAULT.debug, data.debug);
    const typescript = choiseObject(DEFAULT.typescript, data.typescript);
    const babel = choiseObject(DEFAULT.babel, data.babel);
    return {
        version,
        compiler,
        source,
        module,
        debug,
        typescript,
        babel,
    };
}
export default parse;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLm1qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9jb25maWcubXRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sS0FBSyxNQUFNLE9BQU8sQ0FBQTtBQUN6QixPQUFPLENBQUMsTUFBTSxnQkFBZ0IsQ0FBQTtBQUk5QixNQUFNLENBQU4sSUFBWSxZQUdYO0FBSEQsV0FBWSxZQUFZO0lBQ3ZCLHlDQUF5QixDQUFBO0lBQ3pCLCtCQUFlLENBQUE7QUFDaEIsQ0FBQyxFQUhXLFlBQVksR0FBWixZQUFZLEtBQVosWUFBWSxRQUd2QjtBQUVELE1BQU0sQ0FBTixJQUFZLGFBSVg7QUFKRCxXQUFZLGFBQWE7SUFDeEIsOEJBQWEsQ0FBQTtJQUNiLDhCQUFhLENBQUE7SUFDYixrQ0FBaUIsQ0FBQTtBQUNsQixDQUFDLEVBSlcsYUFBYSxHQUFiLGFBQWEsS0FBYixhQUFhLFFBSXhCO0FBdUJELE1BQU0sQ0FBQyxNQUFNLFFBQVEsR0FBRyxnQkFBZ0IsQ0FBQTtBQUV4QyxNQUFNLE9BQU8sR0FBRztJQUNmLE9BQU8sRUFBRSxLQUFLO0lBQ2QsUUFBUSxFQUFFLFlBQVksQ0FBQyxVQUFVO0lBQ2pDLE1BQU0sRUFBRTtRQUNQLFNBQVMsRUFBRSxHQUFHO1FBQ2QsS0FBSyxFQUFFLFdBQVc7UUFDbEIsT0FBTyxFQUFFLENBQUMsU0FBUyxDQUFDO1FBQ3BCLE9BQU8sRUFBRSxFQUFFO0tBQ1g7SUFDRCxNQUFNLEVBQUU7UUFDUCxTQUFTLEVBQUUsR0FBRztRQUNkLElBQUksRUFBRSxRQUFRO1FBQ2QsU0FBUyxFQUFFLGFBQWEsQ0FBQyxJQUFJO0tBQzdCO0lBQ0QsS0FBSyxFQUFFLEVBQ047SUFDRCxVQUFVLEVBQUU7UUFDWCxlQUFlLEVBQUU7WUFDaEIsTUFBTSxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDaEQ7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