
namespace calc {

	export function sub(...args: number[]): number {
		return args.reduce((previous, current) => previous - current, 0)
	}

}
