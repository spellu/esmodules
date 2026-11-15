
const esmc = require('esmodule-builder')
const fs = require('fs')
const fspath = require('path')



describe('Typescript', () => {
    test('1-1', testFixture('1-1'))
    test('1-2', testFixture('1-2'))
    test('1-3', testFixture('1-3'))
    test('1-4', testFixture('1-4'))
    test('2-1', testFixture('2-1'))
    test('2-2', testFixture('2-2'))
    test('2-3', testFixture('2-3'))
})

describe('Babel', () => {
    test('9-1:sourceMap=none', testFixture('9-1'))
    test('9-2:sourceMap=file', testFixture('9-2'))
    test('9-3:sourceMap=inline', testFixture('9-3'))
    // test('9-4', testFixture('9-4'))
})

describe('Babel/flow', () => {
    test('flow', testFixture('flow'))
})

function testFixture(id) {
    function path(type) {
        return fspath.join(__dirname, 'fixtures', `${id}.${type}`)
    }

    return done => {
        const tempDirPath = '__TEST__'

        copyDir(path('in'), tempDirPath)

        const options = {
            configFilePath: fspath.join(tempDirPath, "esmconfig.json"),
            logLevel: 'silent',
        }

        esmc.run(options).then(() => {
            const outDirPath = path('out')
            for (const path of readdir(outDirPath)) {
                const f1 = fs.readFileSync(fspath.join(tempDirPath, path), 'utf8')
                const f2 = fs.readFileSync(fspath.join(outDirPath, path), 'utf8')
                expect(f1).toEqual(f2)
            }

            done()
        })
            .catch(error => {
                done(error)
            })
            .finally(() => {
                fs.rmSync(tempDirPath, { recursive: true })
            })
    }
}

function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest)
    }
    const files = fs.readdirSync(src)

    for (const file of files) {
        const current = fs.lstatSync(fspath.join(src, file))
        if (current.isDirectory()) {
            copyDir(fspath.join(src, file), fspath.join(dest, file))
        }
        else if (current.isSymbolicLink()) {
            const symlink = fs.readlinkSync(fspath.join(src, file))
            fs.symlinkSync(symlink, fspath.join(dest, file))
        }
        else {
            copy(fspath.join(src, file), fspath.join(dest, file))
        }
    }

    function copy(src, dest) {
        fs.writeFileSync(dest, fs.readFileSync(src))
    }
}

function readdir(dir, sub = '.') {
    let results = []
    for (const name of fs.readdirSync(fspath.join(dir, sub))) {
        const path = fspath.join(sub, name)
        const stat = fs.statSync(fspath.join(dir, path))
        if (stat && stat.isDirectory()) {
            results = results.concat(readdir(dir, fspath.join(sub, name)))
        }
        else {
            results.push(path)
        }
    }
    return results
}
