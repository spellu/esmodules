
import P from './platform.mjs'


const packageInfo = JSON.parse(
	P.readFile(
		decodeURIComponent(new URL(import.meta.url).pathname.replace(/\/[^\/]+$/, "/../package.json"))
	)
)

export default {
	version: packageInfo.version,
	program: 'esmc',
}
