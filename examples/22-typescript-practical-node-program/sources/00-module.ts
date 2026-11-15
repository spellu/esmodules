
import calc from './calc'
import chalk from 'chalk'

//-
/// <source/>
//-

console.log('Usege: calc [number] ...')

const args = process.argv.slice(2)

const result = calc.add(...args.map(value => parseFloat(value)))

console.log('――'.repeat(20))
console.log(chalk.gray('Arguments:'), args.map(v => chalk.yellow(v)).join(', '))
console.log(chalk.gray('Result:'), chalk.yellow(result))
console.log('――'.repeat(20))
