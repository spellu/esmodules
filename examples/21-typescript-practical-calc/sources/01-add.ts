
namespace calc {

	export function add(...args: number[]): number {
		return args.reduce((previous, current) => previous + current, 0)
	}

}
