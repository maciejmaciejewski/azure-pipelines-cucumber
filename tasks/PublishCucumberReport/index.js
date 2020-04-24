const tl = require('azure-pipelines-task-lib')
const { join, basename } = require('path')
const { ensureDirSync, copySync, readFileSync, writeFileSync } = require('fs-extra')
const globby = require('globby')
const hat = require('hat')
let consolidatedPath

function getDefaultExecOptions() {
  let execOptions = {}
  execOptions.cwd = join(__dirname, './reporter')
  execOptions.failOnStdErr = false
  execOptions.ignoreReturnCode = false
  execOptions.windowsVerbatimArguments = true
  return execOptions
}

function unifyCucumberReport (filesArray, hasMagic) {
  if(hasMagic) {
    consolidatedPath = `${process.env.SYSTEM_DEFAULTWORKINGDIRECTORY}/cucumber-html-reporter/${hat()}/consolidated`
    ensureDirSync(consolidatedPath)
    tl.debug('Wildcard path detected')
    tl.debug(`Merging report into ${consolidatedPath}`)
  }

  filesArray.forEach(filePath => {
    tl.debug(`Processing ${filePath}`)
    const rawContent = readFileSync(filePath, 'utf-8')
    let jsonContent = JSON.parse(rawContent)

    jsonContent.forEach(feature => {
      feature.elements.forEach(element => {
        // Re-push entries from before / after array into steps array
        // Remove redundant entries

        if (element['before']) {
          element['before'].forEach(beforeHook => {
            beforeHook.keyword = "Before"
            beforeHook.hidden = true
            element['steps'].push(beforeHook)
          })

          delete element['before']
        }

        if (element['after']) {
          element['after'].forEach(afterHook => {
            afterHook.keyword = "After"
            afterHook.hidden = true
            element['steps'].push(afterHook)
          })

          delete element['after']
        }
      })
    })

    const savePath = hasMagic ? join(consolidatedPath, basename(filePath)) : filePath
    tl.debug(`Saving modified report as ${savePath}`)
    writeFileSync(savePath, JSON.stringify(jsonContent))
  })
}

try {
  const tool = tl.tool(tl.which('npm', true))
  tool.arg(["install"])
  const npmProcess = tool.execSync(getDefaultExecOptions())

  if(npmProcess.code !== 0) {
    tl.debug(npmProcess)
    throw new Error('Failed to install dependencies')
  }

  const inputPath = (tl.getPathInput('jsonDir', true, false)).replace(/\\/g, '/')
  const pathHasMagic = globby.hasMagic(inputPath)
  const files = globby.sync([`${inputPath}/*.json`])
  tl.debug(`Found ${files.length} matching ${inputPath} pattern`)

  unifyCucumberReport(files, pathHasMagic)
  const outputFile = join(tl.getPathInput('outputPath', true, true), 'cucumber.html')
  const runOpts = getDefaultExecOptions()
  const nodeTool = tl.tool(tl.which('node', true))
  nodeTool.arg(["script.js"])

  runOpts.env = {
    "JSON_DIR": pathHasMagic ? consolidatedPath : inputPath,
    "OUTPUT_PATH": outputFile,
    "REPORT_SUITES_AS_SCENARIOS": tl.getBoolInput('reportSuiteAsScenarios', true),
    "RAW_METADATA": tl.getInput('metadata', false),
    "THEME": tl.getInput('theme', true),
    "REPORT_TITLE": tl.getInput('title', false),
    "REPORT_NAME": tl.getInput('name', false)
  }

  const nodeProcess = nodeTool.execSync(runOpts)
  if(nodeProcess.code !== 0) {
    tl.debug(nodeProcess)
    throw new Error('Failed to run script')
  }

  tl.addAttachment('cucumber.report', 'cucumber_report.html', outputFile)
} catch (e) {
  tl.warning(e)
  tl.setResult(tl.TaskResult.SucceededWithIssues)
}
