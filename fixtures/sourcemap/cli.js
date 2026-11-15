#!/usr/bin/env node

const { SourceMapConsumer } = require('source-map')
const fs = require('fs')

const map = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))

SourceMapConsumer.with(map, null, (consumer) => {
	consumer.eachMapping(_ => {
		console.log(`${consumer.file}(${_.generatedLine}:${_.generatedColumn}) => ${_.source}(${_.originalLine}:${_.originalColumn}) : ${_.name}`)
	})
})

