
import json5 from 'json5'
import P from './platform.mjs'



export enum CompilerKind {
	TypeScript = 'typescript',
	Babel = 'babel',
}

export enum SourceMapKind {
	None = 'none',
	File = 'file',
	Inline = 'inline',
}

export type Config = {
	version: string
	compiler: CompilerKind
	source: {
		directory: string
		entry: string
		include: string[]
		exclude: string[]
	}
	module: {
		directory: string
		name: string
		sourceMap: SourceMapKind
	}
	debug: {
		outputSource?: string
	}
	typescript: { compilerOptions: {} }
	babel: {}
}

export const FILENAME = 'esmconfig.json'

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
	debug: {
	},
	typescript: {
		compilerOptions: {
			locale: (process.env.LANG ?? '').substring(0, 2),
		}
	},
	babel: {},
} as Config

function parse(
	image: string,
): Config {
	const data: Partial<Config> = json5.parse(image)

	const choiseValue = function <T>(defaultValue: T, specifiedValue: any, checker?: (value: any) => T): T {
		const value = specifiedValue || defaultValue
		return checker ? checker(value) : value
	}

	const choiseObject = function <T extends {}>(defaultValue?: T, specifiedValue?: {}): T {
		return Object.assign({}, defaultValue, specifiedValue)
	}

	const version = choiseValue(DEFAULT.version, data.version)
	const compiler = choiseValue(DEFAULT.compiler, data.compiler, (value: string) => {
		const lowerValue = value.toLowerCase()
		if (value == 'typescript') return CompilerKind.TypeScript
		if (value == 'babel') return CompilerKind.Babel
		return CompilerKind.TypeScript
	})
	const source = choiseValue(DEFAULT.source, data.source, value => {
		if (typeof value === 'string') {
			return {
				directory: '.',
				entry: value,
				include: ['**/*'],
				exclude: [],
			}
		}
		// TODO: check value.entry
		const include = choiseValue(DEFAULT.source.include, typeof value.include === 'string' ? [value.include] : value.include)
		const exclude = choiseValue(DEFAULT.source.exclude, typeof value.exclude === 'string' ? [value.exclude] : value.exclude)
		return {
			directory: value.directory || DEFAULT.source.directory,
			entry: value.entry,
			include,
			exclude,
		}
	})
	const module = choiseValue(DEFAULT.module, data.module, value => {
		if (typeof value === 'string') {
			return {
				directory: P.extractDirectoryPath(value),
				name: P.extractFileTitlePath(value),
				sourceMap: SourceMapKind.None,
			}
		}
		else if (typeof value === 'object') {
			// TODO: check value.name
			const sourceMap = choiseValue(DEFAULT.module.sourceMap, value.sourceMap, (value: string) => {
				const lowerValue = value.toLowerCase()
				if (value == 'file') return SourceMapKind.File
				if (value == 'inline') return SourceMapKind.Inline
				return SourceMapKind.None
			})
			return {
				directory: value.directory || DEFAULT.module.directory,
				name: value.name,
				sourceMap: sourceMap,
			}
		}
		else if (typeof value === 'undefined') {
			// TODO Error handling
			console.log('Parameter "module" must need.')
			return { directory: '', name: '', sourceMap: SourceMapKind.None }
		}
		else {
			// TODO Error handling
			console.log('Parameter "module" must need.')
			return { directory: '', name: '', sourceMap: SourceMapKind.None }
		}
	})
	const debug = choiseObject(DEFAULT.debug, data.debug)
	const typescript = choiseObject(DEFAULT.typescript, data.typescript)
	const babel = choiseObject(DEFAULT.babel, data.babel)

	return {
		version,
		compiler,
		source,
		module,
		debug,
		typescript,
		babel,
	}
}



export default parse
