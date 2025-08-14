const tl = require('azure-pipelines-task-lib')
const path = require('path')
const fs = require('fs-extra')
const glob = require('glob')
let consolidatedPath

function getDefaultExecOptions () {
  let execOptions = {}
  execOptions.cwd = path.join(__dirname, './reporter')
  execOptions.failOnStdErr = false
  execOptions.ignoreReturnCode = false
  return execOptions
}

function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

function unifyCucumberReport (filesArray, hasMagic) {
  if (hasMagic) {
    consolidatedPath = `${process.env.SYSTEM_DEFAULTWORKINGDIRECTORY}/cucumber-html-reporter/${generateId()}/consolidated`
    fs.ensureDirSync(consolidatedPath)
    console.log('Wildcard path detected')
    console.log(`Merging report into ${consolidatedPath}`)
  }

  filesArray.forEach(filePath => {
    console.log(`Processing ${filePath}`)
    const rawContent = fs.readFileSync(filePath, 'utf-8')
    const jsonContent = JSON.parse(rawContent)

    jsonContent.forEach(feature => {
      feature.elements.forEach(element => {
        // Re-push entries from before / after array into steps array
        // Remove redundant entries

        if (element.before) {
          element.before.forEach(beforeHook => {
            beforeHook.keyword = 'Before'
            beforeHook.hidden = false
            element.steps.push(beforeHook)
          })

          delete element.before
        }

        if (element.after) {
          element.after.forEach(afterHook => {
            afterHook.keyword = 'After'
            afterHook.hidden = false
            element.steps.push(afterHook)
          })

          delete element.after
        }
      })
    })

    const savePath = hasMagic ? path.join(consolidatedPath, path.basename(filePath)) : filePath
    console.log(`Saving modified report as ${savePath}`)
    fs.writeFileSync(savePath, JSON.stringify(jsonContent, null, 2))
  })
}

try {
  const tool = tl.tool(tl.which('npm', true))
  tool.arg(['install'])
  const npmProcess = tool.execSync(getDefaultExecOptions())

  if (npmProcess.code !== 0) {
    throw new Error('Failed to install dependencies')
  }

  const inputPath = tl.getPathInput('jsonDir', true, false)
  const normalizedInputPath = inputPath.replace(/\\/g, '/')
  const pathHasMagic = glob.hasMagic(normalizedInputPath)
  const files = glob.sync(`${normalizedInputPath}/*.json`)
  console.log(`Found ${files.length} matching ${inputPath} pattern`)

  unifyCucumberReport(files, pathHasMagic)
  const outputPath = tl.getPathInput('outputPath', true, true)
  const outputReportFile = path.join(outputPath, 'cucumber.html')
  const runOpts = getDefaultExecOptions()
  const nodeTool = tl.tool(tl.which('node', true))
  const reportName = tl.getInput('name', false);
  nodeTool.arg(['script.js'])

  runOpts.env = {
    JSON_DIR: pathHasMagic ? consolidatedPath : normalizedInputPath,
    OUTPUT_PATH: outputReportFile,
    REPORT_SUITES_AS_SCENARIOS: tl.getBoolInput('reportSuiteAsScenarios', true),
    RAW_METADATA: tl.getInput('metadata', false),
    THEME: tl.getInput('theme', true),
    REPORT_TITLE: tl.getInput('title', false),
    REPORT_NAME: reportName
  }

  const nodeProcess = nodeTool.execSync(runOpts)
  if (nodeProcess.code !== 0) {
    throw new Error('Failed to run script')
  }

  console.log(`Uploading attachment file: ${outputReportFile} as type cucumber.report with name ${reportName}.html`)
  tl.addAttachment('cucumber.report', `${reportName}.html`, outputReportFile)

  const normalizedOutputPath = outputPath.replace(/\\/g, '/')
  const screenshots = globby.sync(`${normalizedOutputPath}/screenshots/**.png`)
  screenshots.forEach(screenshotPath => {
    tl.addAttachment('cucumber.screenshot', basename(screenshotPath), screenshotPath)
    console.log(`Uploading Screenshot ${screenshotPath}`)
  })
} catch (e) {
  tl.warning(e)
  tl.setResult(tl.TaskResult.SucceededWithIssues)
}
