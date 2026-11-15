
import meta from './meta.mjs'
import { FILENAME as CONFIG_FILENAME } from './config.mjs'
import { load as loadProject, build as buildProject } from './project.mjs'
import P from './platform.mjs'
import chalk, { supportsColor } from 'chalk'
import log from 'npmlog'
import commander, { Command } from 'commander'



type Program = {
	configFilePath: string
	logLevel?: string
}


const LOG_LEVELS = [
	"silly",
	"verbose",
	"info",
	//	"timing",
	//	"http",
	"notice",
	"warn",
	"error",
	"silent",
]


function processCommandLine(
	args: string[],
): Program {
	const program = new Command()

	let config: string = '.'
	let logLevel: string = 'info'

	program
		.version(meta.version, '-v, --version')
		.arguments('[config]')
		.action(arg1 => {
			if (arg1) { config = arg1 }
		})
		.option('-l, --log <level>', 'Log level', value => {
			let level: string = value.toLowerCase()

			if (!LOG_LEVELS.includes(level)) {
				log.warn(meta.program, chalk.red('invalid log-level:'), chalk.white.bgRed(value))
				return
			}

			logLevel = level
		})
		.option('--color <mode>', 'Color Mode')
		.parse(args)

	return {
		configFilePath: P.testDirectoryExists(config)
			? P.joinPath(config, CONFIG_FILENAME)
			: config,
		logLevel: logLevel,
	}
}


async function run(
	program: Program,
): Promise<boolean> {
	configureLogLibrary(program)

	const configFilePath = P.resolvePath(program.configFilePath)

	log.info(meta.program, chalk.green('ES Module builder'))
	log.info(meta.program, chalk.yellow('Version: ') + meta.version)
	log.info(meta.program, chalk.yellow('CWD: ') + process.cwd())
	log.info(meta.program, chalk.yellow('Config: ') + configFilePath)

	if (!P.testFileExists(configFilePath)) {
		log.error(meta.program, chalk.red('Config file not found:'), chalk.white.bgRed(configFilePath))
		return false
	}

	const project = loadProject(configFilePath)

	log.verbose(meta.program, "...config loaded")

	log.silly(meta.program, JSON.stringify(project.config, null, 2))

	log.verbose(meta.program, chalk.yellow('Path: '), configFilePath)
	log.verbose(meta.program, chalk.yellow('Version: '), project.config.version)
	log.verbose(meta.program, chalk.yellow('Files: '), project.codePaths)

	await buildProject(project)

	return true
}


function configureLogLibrary(
	program: Program
): void {
	// Configure color mode
	if (supportsColor !== false) {
		log.enableColor()
	}
	else {
		log.disableColor()
	}

	log.level = program.logLevel || 'info'
}



export default {
	processCommandLine,
	run,
}
