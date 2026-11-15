
import fs from 'fs'
import fspath from 'path'

export default {
	extractDirectoryPath,
	extractFileTitlePath,
	joinPath,
	resolvePath,
	relativePath,
	normalizePath,
	testDirectoryExists,
	testFileExists,
	readFile,
	writeFile,
	touchDirectories,
}

function extractDirectoryPath(
	path: string,
): string {
	return fspath.dirname(path)
}

function extractFileTitlePath(
	path: string,
	extension?: string,
): string {
	return fspath.basename(path, extension)
}

function joinPath(
	...paths: string[]
): string {
	return fspath.join(...paths)
}

function resolvePath(
	...paths: string[]
): string {
	return fspath.normalize(fspath.join(...paths))
}

function relativePath(
	baseDirectoryPath: string,
	path: string,
): string {
	return fspath.relative(baseDirectoryPath, path)
}

function normalizePath(
	path: string,
): string {
	return fspath.normalize(path)
}

function testDirectoryExists(
	path: string,
): boolean {
	try {
		const stat = fs.statSync(path)
		return stat.isDirectory()
	}
	catch {
		return false
	}
}

function testFileExists(
	path: string,
): boolean {
	try {
		fs.accessSync(path, fs.constants.R_OK)
		return true
	}
	catch (error) {
		return false
	}
}

function readFile(
	path: string,
): string {
	return fs.readFileSync(path, { encoding: 'utf8' })
}

function writeFile(
	path: string,
	content: string,
): void {
	return fs.writeFileSync(touchDirectories(path), content, { encoding: 'utf8' })
}

function touchDirectories(
	filepath: string,
): string {
	const dirpath = fspath.dirname(filepath)

	if (!fs.existsSync(dirpath)) {
		fs.mkdirSync(dirpath, {
			recursive: true
		})
	}

	return filepath
}
