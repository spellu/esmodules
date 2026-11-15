#!/usr/bin/env node

import esmc from 'esmodule-builder'



try {
	const program = esmc.processCommandLine(process.argv)

	const result = await esmc.run(
		program
	)

	process.exit(result ? 0 : 1)
}
catch (error) {
	console.error(error)

	process.exit(1)
}
