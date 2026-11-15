
import meta from './meta.mjs'
import parseConfig, { Config } from './config.mjs'
import SourceMap from './sourcemap.mjs'
import P from './platform.mjs'
import tsc from './compiler/tsc.mjs'
import babel from './compiler/babel.mjs'
import chalk from 'chalk'
import log from 'npmlog'
import glob from 'glob'

export default {
	load,
	build,
}

export type Project = {
	baseDirectoryPath: string
	configFilePath?: string
	config: Config
	entryPath: string
	codePaths: string[]
	moduleDirectoryPath: string
	modulePathWithoutExtension: string
	sourceMap: SourceMap
}

export function load(
	configFilePath: string,
	baseDirectoryPath: string = P.extractDirectoryPath(configFilePath),
): Project {
	const text = P.readFile(configFilePath)

	const config = parseConfig(text)

	const entryPath = P.resolvePath(baseDirectoryPath, config.source.directory, config.source.entry)

	if (!P.testFileExists(entryPath)) {
		log.error(meta.program, chalk.red('Source file not found:'), chalk.white.bgRed(entryPath))
		throw new Error()
	}

	const codePaths = expandFilePatterns(baseDirectoryPath, config)

	const sourceMap = createSourceMap(entryPath, codePaths)

	return {
		baseDirectoryPath,
		configFilePath,
		config,
		entryPath,
		codePaths,
		moduleDirectoryPath: config.module.directory,
		modulePathWithoutExtension: P.resolvePath(baseDirectoryPath, config.module.directory, config.module.name),
		sourceMap,
	}
}

function expandFilePatterns(directoryPath: string, config: Config): string[] {
	const result: string[] = []

	const excludePaths: string[] = []

	for (let pattern of config.source.exclude) {
		const matches = glob.sync(P.resolvePath(directoryPath, config.source.directory, pattern))

		excludePaths.push(...matches)
	}

	for (let pattern of config.source.include) {
		// Add suffix '.ts'
		if (pattern.endsWith('/')) {
			pattern = pattern + '*.ts'
		}
		else if (pattern.endsWith('*')) {
			pattern = pattern + '.ts'
		}

		// const matches = glob.sync(fs.realpathSync(directoryPath) + '/' + pattern)
		const matches = glob.sync(P.resolvePath(directoryPath, config.source.directory, pattern))

		for (const match of matches) {
			// exclude ${source.entry} file
			if (match == P.resolvePath(directoryPath, config.source.directory, config.source.entry)) continue

			// exclude ${exclude} pattern
			if (excludePaths.indexOf(match) != -1) continue

			result.push(P.normalizePath(match))
		}
	}

	return result
}

function createSourceMap(
	entryPath: string,
	codePaths: string[],
): SourceMap {
	const sourceMap = new SourceMap()

	let afterPartLineIndex = 0

	const lines = readFile(entryPath)

	for (let index = 0; index < lines.length; ++index) {
		const line = lines[index]

		const match = line.match(/^\s*\/\/\/\s*<\s*source\s*\/>/)

		if (match) {
			// 1. before part
			sourceMap.addSource(
				entryPath,
				lines.slice(0, index),
				1,
			)

			afterPartLineIndex = index + 1

			// 2. source part
			for (const path of codePaths) {
				const lines = readFile(path)

				const count = lines.length

				sourceMap.addSource(
					path,
					lines,
					1,
				)
			}

			break
		}
	}

	// 3. after part
	sourceMap.addSource(
		entryPath,
		lines.slice(afterPartLineIndex),
		1 + afterPartLineIndex,
	)

	return sourceMap
}

function readFile(
	path: string,
): string[] {
	const content = P.readFile(path)

	return (content.match(/[\n]$/g) ? content.substring(0, content.length - 1) : content)
		.split(/\r\n|\n/)
}

export async function build(
	project: Project,
) {
	switch (project.config.compiler) {
		case 'typescript':
			await tsc.build(project)
			break

		case 'babel':
			await babel.build(project)
			break

		default:
			log.error(meta.program, 'Invalid compiler specified.')
	}
}
