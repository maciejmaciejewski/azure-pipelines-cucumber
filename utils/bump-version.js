const fs = require('fs')
const path = require('path')
const semver = require('semver')

const packageFile = path.resolve(__dirname, '../package.json')
const vssExtensionFile = path.resolve(__dirname, '../vss-extension.json')

const package = require(packageFile)
const vssExtension = require(vssExtensionFile)

const currentVersion = package.version
console.log(`current version ${package.version}`)
package.version = semver.inc(currentVersion, 'patch', {}, null)
console.log(`next version ${package.version}`)
vssExtension.version = package.version

fs.writeFileSync(packageFile, JSON.stringify(package, null, 2))
fs.writeFileSync(vssExtensionFile, JSON.stringify(vssExtension, null, 2))
console.log('done.')
