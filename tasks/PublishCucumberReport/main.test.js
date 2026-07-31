const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { run } = require('./index.js')

function tmpDir (prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix))
}

function writeFixture (dir, name, content) {
  const filePath = path.join(dir, name)
  fs.writeFileSync(filePath, JSON.stringify(content))
  return filePath
}

const TASK_RESULT = { SucceededWithIssues: 'SucceededWithIssues' }

function fakeDeps ({ inputs, execResults }) {
  const invocations = []
  const attachments = []
  const warnings = []
  let result = null

  function tool (toolPath) {
    const runner = {
      args: [],
      arg (val) {
        runner.args = runner.args.concat(val)
        return runner
      },
      execSync () {
        const cmdline = [toolPath, ...runner.args].join(' ')
        invocations.push(cmdline)
        const execResult = execResults[cmdline]
        if (!execResult) {
          throw new Error(`No fake exec result registered for: ${cmdline}`)
        }
        return execResult
      }
    }
    return runner
  }

  return {
    deps: {
      tool,
      which: name => name,
      getPathInput: name => inputs[name],
      getInput: name => inputs[name],
      getBoolInput: name => inputs[name],
      addAttachment: (type, name, filePath) => attachments.push({ type, name, filePath }),
      warning: msg => warnings.push(String(msg)),
      setResult: code => { result = code },
      TaskResult: TASK_RESULT
    },
    invocations,
    attachments,
    warnings,
    getResult: () => result
  }
}

test('run() installs dependencies, unifies reports, and uploads the report and screenshots on success', async () => {
  const inputDir = tmpDir('cucumber-run-input-')
  writeFixture(inputDir, 'report.json', [{ elements: [{ steps: [{ name: 'step 1' }], before: [{ name: 'setup' }] }] }])

  const outputDir = tmpDir('cucumber-run-output-')
  fs.mkdirSync(path.join(outputDir, 'screenshots'), { recursive: true })
  fs.writeFileSync(path.join(outputDir, 'screenshots', 'failure.png'), '')

  const fake = fakeDeps({
    inputs: {
      jsonDir: inputDir,
      outputPath: outputDir,
      theme: 'bootstrap',
      reportSuiteAsScenarios: 'true',
      name: 'cucumber',
      title: 'My Report'
    },
    execResults: {
      'npm install': { code: 0 },
      'node script.js': { code: 0 }
    }
  })

  await run(fake.deps)

  assert.deepEqual(fake.warnings, [])
  assert.equal(fake.getResult(), null)
  assert.deepEqual(fake.invocations, ['npm install', 'node script.js'])

  const reportAttachments = fake.attachments.filter(a => a.type === 'cucumber.report')
  assert.equal(reportAttachments.length, 1)
  assert.equal(reportAttachments[0].name, 'cucumber.html')

  const screenshotAttachments = fake.attachments.filter(a => a.type === 'cucumber.screenshot')
  assert.equal(screenshotAttachments.length, 1)
  assert.equal(screenshotAttachments[0].name, 'failure.png')

  const unified = JSON.parse(fs.readFileSync(path.join(inputDir, 'report.json'), 'utf-8'))
  assert.deepEqual(unified[0].elements[0].steps.map(s => s.name), ['setup', 'step 1'])
})

test('run() reports SucceededWithIssues when installing reporter dependencies fails', async () => {
  const fake = fakeDeps({
    inputs: {
      jsonDir: tmpDir('cucumber-run-input-'),
      outputPath: tmpDir('cucumber-run-output-'),
      theme: 'bootstrap',
      reportSuiteAsScenarios: 'true'
    },
    execResults: {
      'npm install': { code: 1 }
    }
  })

  await run(fake.deps)

  assert.equal(fake.getResult(), TASK_RESULT.SucceededWithIssues)
  assert.equal(fake.warnings.length, 1)
  assert.match(fake.warnings[0], /Failed to install dependencies/)
  assert.deepEqual(fake.invocations, ['npm install'])
  assert.deepEqual(fake.attachments, [])
})

test('run() reports SucceededWithIssues when report generation fails', async () => {
  const inputDir = tmpDir('cucumber-run-input-')
  writeFixture(inputDir, 'report.json', [{ elements: [{ steps: [{ name: 'step 1' }] }] }])
  const outputDir = tmpDir('cucumber-run-output-')

  const fake = fakeDeps({
    inputs: {
      jsonDir: inputDir,
      outputPath: outputDir,
      theme: 'bootstrap',
      reportSuiteAsScenarios: 'true'
    },
    execResults: {
      'npm install': { code: 0 },
      'node script.js': { code: 1 }
    }
  })

  await run(fake.deps)

  assert.equal(fake.getResult(), TASK_RESULT.SucceededWithIssues)
  assert.equal(fake.warnings.length, 1)
  assert.match(fake.warnings[0], /Failed to run script/)
  assert.deepEqual(fake.attachments, [])
})

test('run() consolidates wildcard input into a single directory before generating the report', async () => {
  const previousWorkDir = process.env.SYSTEM_DEFAULTWORKINGDIRECTORY
  const workDir = tmpDir('cucumber-run-workdir-')
  process.env.SYSTEM_DEFAULTWORKINGDIRECTORY = workDir

  try {
    const inputDir = tmpDir('cucumber-run-input-')
    const agent1Dir = path.join(inputDir, 'agent1')
    const agent2Dir = path.join(inputDir, 'agent2')
    fs.mkdirSync(agent1Dir)
    fs.mkdirSync(agent2Dir)
    writeFixture(agent1Dir, 'a.json', [{ elements: [{ steps: [{ name: 'step 1' }] }] }])
    writeFixture(agent2Dir, 'b.json', [{ elements: [{ steps: [{ name: 'step 2' }] }] }])
    const outputDir = tmpDir('cucumber-run-output-')

    const fake = fakeDeps({
      inputs: {
        jsonDir: path.join(inputDir, '*'),
        outputPath: outputDir,
        theme: 'bootstrap',
        reportSuiteAsScenarios: 'true'
      },
      execResults: {
        'npm install': { code: 0 },
        'node script.js': { code: 0 }
      }
    })

    await run(fake.deps)

    assert.deepEqual(fake.warnings, [])
    const originalA = JSON.parse(fs.readFileSync(path.join(agent1Dir, 'a.json'), 'utf-8'))
    assert.deepEqual(originalA[0].elements[0].steps.map(s => s.name), ['step 1'])

    const reportsRoot = path.join(workDir, 'cucumber-html-reporter')
    const [generatedId] = fs.readdirSync(reportsRoot)
    const consolidatedDir = path.join(reportsRoot, generatedId, 'consolidated')
    assert.deepEqual(fs.readdirSync(consolidatedDir).sort(), ['a.json', 'b.json'])
  } finally {
    if (previousWorkDir === undefined) {
      delete process.env.SYSTEM_DEFAULTWORKINGDIRECTORY
    } else {
      process.env.SYSTEM_DEFAULTWORKINGDIRECTORY = previousWorkDir
    }
  }
})
