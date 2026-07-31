const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { unifyCucumberReport } = require('./index.js')

function writeFixture (dir, name, content) {
  const filePath = path.join(dir, name)
  fs.writeFileSync(filePath, JSON.stringify(content))
  return filePath
}

function tmpDir (prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix))
}

test('prepends before hooks ahead of the original steps', () => {
  const dir = tmpDir('cucumber-unify-before-')
  const filePath = writeFixture(dir, 'report.json', [
    { elements: [{ steps: [{ name: 'step 1' }, { name: 'step 2' }], before: [{ name: 'before hook' }] }] }
  ])

  unifyCucumberReport([filePath], false)

  const [element] = JSON.parse(fs.readFileSync(filePath, 'utf-8'))[0].elements
  assert.deepEqual(element.steps.map(s => s.name), ['before hook', 'step 1', 'step 2'])
  assert.equal(element.steps[0].keyword, 'Before')
  assert.equal(element.steps[0].hidden, false)
  assert.equal(element.before, undefined)
})

test('appends after hooks behind the original steps', () => {
  const dir = tmpDir('cucumber-unify-after-')
  const filePath = writeFixture(dir, 'report.json', [
    { elements: [{ steps: [{ name: 'step 1' }, { name: 'step 2' }], after: [{ name: 'after hook' }] }] }
  ])

  unifyCucumberReport([filePath], false)

  const [element] = JSON.parse(fs.readFileSync(filePath, 'utf-8'))[0].elements
  assert.deepEqual(element.steps.map(s => s.name), ['step 1', 'step 2', 'after hook'])
  assert.equal(element.steps[2].keyword, 'After')
  assert.equal(element.steps[2].hidden, false)
  assert.equal(element.after, undefined)
})

test('places before and after hooks on either side of the original steps', () => {
  const dir = tmpDir('cucumber-unify-both-')
  const filePath = writeFixture(dir, 'report.json', [
    {
      elements: [{
        steps: [{ name: 'step 1' }, { name: 'step 2' }],
        before: [{ name: 'before hook' }],
        after: [{ name: 'after hook' }]
      }]
    }
  ])

  unifyCucumberReport([filePath], false)

  const [element] = JSON.parse(fs.readFileSync(filePath, 'utf-8'))[0].elements
  assert.deepEqual(element.steps.map(s => s.name), ['before hook', 'step 1', 'step 2', 'after hook'])
})

test('leaves steps unchanged for scenarios with no hooks', () => {
  const dir = tmpDir('cucumber-unify-none-')
  const filePath = writeFixture(dir, 'report.json', [
    { elements: [{ steps: [{ name: 'step 1' }, { name: 'step 2' }] }] }
  ])

  unifyCucumberReport([filePath], false)

  const [element] = JSON.parse(fs.readFileSync(filePath, 'utf-8'))[0].elements
  assert.deepEqual(element.steps.map(s => s.name), ['step 1', 'step 2'])
})

test('wildcard input writes a consolidated copy without mutating the original file', () => {
  const previousWorkDir = process.env.SYSTEM_DEFAULTWORKINGDIRECTORY
  const workDir = tmpDir('cucumber-workdir-')
  process.env.SYSTEM_DEFAULTWORKINGDIRECTORY = workDir

  try {
    const inputDir = tmpDir('cucumber-input-')
    const original = [{ elements: [{ steps: [{ name: 'step 1' }], before: [{ name: 'before hook' }] }] }]
    const filePath = writeFixture(inputDir, 'report.json', original)

    unifyCucumberReport([filePath], true)

    const untouched = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    assert.deepEqual(untouched, original)

    const reportsRoot = path.join(workDir, 'cucumber-html-reporter')
    const [generatedId] = fs.readdirSync(reportsRoot)
    const consolidatedPath = path.join(reportsRoot, generatedId, 'consolidated', 'report.json')
    const merged = JSON.parse(fs.readFileSync(consolidatedPath, 'utf-8'))
    assert.deepEqual(merged[0].elements[0].steps.map(s => s.name), ['before hook', 'step 1'])
  } finally {
    if (previousWorkDir === undefined) {
      delete process.env.SYSTEM_DEFAULTWORKINGDIRECTORY
    } else {
      process.env.SYSTEM_DEFAULTWORKINGDIRECTORY = previousWorkDir
    }
  }
})
