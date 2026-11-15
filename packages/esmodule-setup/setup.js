#!/usr/bin/env node

const fs = require('fs')
const fspath = require('path')



const store = []

function setup(localDir, moduleDir, { link, force, verbose }) {
	if (!fs.existsSync(localDir)) {
		fs.mkdirSync(localDir)
	}

	const config = loadConfig(fspath.join(moduleDir, 'package.json'))

	retreiveDependencyModules(localDir, config.name, config.dependencies || {}, { link, force, verbose })
}

function retreiveDependencyModules(localDir, name, packages, { link, force, verbose }) {
	if (verbose) {
		console.log(`-- Enter "${name}".`)
	}

	for (const package in packages) {
		try {
			const configPath = require.resolve(fspath.join(package, 'package.json'))

			const moduleDir = fspath.dirname(configPath)

			const config = loadConfig(configPath)

			if (!config.main || !config.main.endsWith('.mjs')) {
				continue
			}

			if (store.includes(config.name)) { continue }

			if (verbose) {
				console.log(`-- Process "${config.name}".`)
			}

			retreiveModule(
				[config.main, config.types].filter(_ => _),
				moduleDir,
				localDir,
				link,
				force
			)

			store.push(config.name)

			retreiveDependencyModules(localDir, config.name, config.dependencies || {}, { link, force, verbose })
		}
		catch (error) {
			continue
		}
	}

	if (verbose) {
		console.log(`-- Leave "${name}".`)
	}
}

function loadConfig(path) {
	try {
		return JSON.parse(fs.readFileSync(path, { encoding: 'UTF-8' }))
	}
	catch (e) {
		console.error(`NPM config "${path}" not found.`)
		return {}
	}
}

function retreiveModule(names, moduleDir, localDir, link, force) {
	for (const name of names) {
		const modulePath = fspath.join(moduleDir, name)

		const localPath = fspath.join(localDir, fspath.basename(name))

		if (force && fs.existsSync(localPath)) {
			fs.unlinkSync(localPath)
		}

		if (!fs.existsSync(localPath)) {
			if (link) {
				fs.symlinkSync(fspath.relative(localDir, modulePath), localPath)

				console.info(`Create symlink "${localPath}".`)
			}
			else {
				fs.copyFileSync(modulePath, localPath)

				console.info(`Create file "${localPath}".`)
			}
		}
	}
}



function usage(
) {
	console.info('Usage: esm-setup <link|copy> [--safe|--force] [--verbose]')
	return process.exit(1)
}

const options = {
	link: undefined,
	force: false,
	verbose: false,
}

switch (process.argv[2]) {
	case 'link':
		options.link = true
		break
	case 'copy':
		options.link = false
		break
	default:
		usage()
}

for (const option of process.argv.slice(3)) {
	switch (option) {
		case '--safe':
			options.force = false
			break
		case '--force':
			options.force = true
			break
		case '--verbose':
			options.verbose = true
			break
		default:
			usage()
	}
}

setup('./modules', '.', options)
