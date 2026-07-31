const tl = require('azure-pipelines-task-lib')
const { join, basename } = require('path')
const { ensureDirSync, readFileSync, writeFileSync } = require('fs-extra')
const { glob, hasMagic } = require('glob')
const hat = require('hat')
let consolidatedPath

function getDefaultExecOptions () {
  let execOptions = {}
  execOptions.cwd = join(__dirname, './reporter')
  execOptions.failOnStdErr = false
  execOptions.ignoreReturnCode = false
  return execOptions
}

function unifyCucumberReport (filesArray, hasMagic) {
  if (hasMagic) {
    consolidatedPath = `${process.env.SYSTEM_DEFAULTWORKINGDIRECTORY}/cucumber-html-reporter/${hat()}/consolidated`
    ensureDirSync(consolidatedPath)
    console.log('Wildcard path detected')
    console.log(`Merging report into ${consolidatedPath}`)
  }

  filesArray.forEach(filePath => {
    console.log(`Processing ${filePath}`)
    const rawContent = readFileSync(filePath, 'utf-8')
    const jsonContent = JSON.parse(rawContent)

    jsonContent.forEach(feature => {
      feature.elements.forEach(element => {
        // Re-push entries from before / after array into steps array
        // Remove redundant entries

        const beforeHooks = (element.before || []).map(beforeHook => {
          beforeHook.keyword = 'Before'
          beforeHook.hidden = false
          return beforeHook
        })
        delete element.before

        const afterHooks = (element.after || []).map(afterHook => {
          afterHook.keyword = 'After'
          afterHook.hidden = false
          return afterHook
        })
        delete element.after

        element.steps = [...beforeHooks, ...element.steps, ...afterHooks]
      })
    })

    const savePath = hasMagic ? join(consolidatedPath, basename(filePath)) : filePath
    console.log(`Saving modified report as ${savePath}`)
    writeFileSync(savePath, JSON.stringify(jsonContent, null, 2))
  })
}

// Orchestration logic, taking its azure-pipelines-task-lib surface as `deps` so it can be
// driven by plain fakes in tests instead of a real build agent.
async function run (deps) {
  try {
    const tool = deps.tool(deps.which('npm', true))
    tool.arg(['install'])
    const npmProcess = tool.execSync(getDefaultExecOptions())

    if (npmProcess.code !== 0) {
      throw new Error('Failed to install dependencies')
    }

    const inputPath = deps.getPathInput('jsonDir', true, false)
    const normalizedInputPath = inputPath.replace(/\\/g, '/')
    const pathHasMagic = hasMagic(normalizedInputPath)
    const files = await glob(`${normalizedInputPath}/*.json`)
    console.log(`Found ${files.length} matching ${inputPath} pattern`)

    unifyCucumberReport(files, pathHasMagic)
    const outputPath = deps.getPathInput('outputPath', true, true)
    const outputReportFile = join(outputPath, 'cucumber.html')
    const runOpts = getDefaultExecOptions()
    const nodeTool = deps.tool(deps.which('node', true))
    const reportName = deps.getInput('name', false)
    nodeTool.arg(['script.js'])

    runOpts.env = {
      JSON_DIR: pathHasMagic ? consolidatedPath : normalizedInputPath,
      OUTPUT_PATH: outputReportFile,
      REPORT_SUITES_AS_SCENARIOS: deps.getBoolInput('reportSuiteAsScenarios', true),
      RAW_METADATA: deps.getInput('metadata', false),
      THEME: deps.getInput('theme', true),
      REPORT_TITLE: deps.getInput('title', false),
      REPORT_NAME: reportName
    }

    const nodeProcess = nodeTool.execSync(runOpts)
    if (nodeProcess.code !== 0) {
      throw new Error('Failed to run script')
    }

    console.log(`Uploading attachment file: ${outputReportFile} as type cucumber.report with name ${reportName}.html`)
    deps.addAttachment('cucumber.report', `${reportName}.html`, outputReportFile)

    const normalizedOutputPath = outputPath.replace(/\\/g, '/')
    const screenshots = await glob(`${normalizedOutputPath}/screenshots/**.png`)
    screenshots.forEach(screenshotPath => {
      deps.addAttachment('cucumber.screenshot', basename(screenshotPath), screenshotPath)
      console.log(`Uploading Screenshot ${screenshotPath}`)
    })
  } catch (e) {
    deps.warning(e)
    deps.setResult(deps.TaskResult.SucceededWithIssues)
  }
}

async function main () {
  await run({
    tool: tl.tool,
    which: tl.which,
    getPathInput: tl.getPathInput,
    getInput: tl.getInput,
    getBoolInput: tl.getBoolInput,
    addAttachment: tl.addAttachment,
    warning: tl.warning,
    setResult: tl.setResult,
    TaskResult: tl.TaskResult
  })
}

module.exports = { unifyCucumberReport, main, run }

if (require.main === module) {
  main()
}
