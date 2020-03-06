const tl = require('azure-pipelines-task-lib')
const { join } = require('path')
const { ensureDirSync, copySync } = require('fs-extra')

const path = "/tmp/reporter"

function getDefaultExecOptions() {
  let execOptions = {}
  execOptions.cwd = join(__dirname, './reporter')
  execOptions.failOnStdErr = false
  execOptions.ignoreReturnCode = false
  execOptions.windowsVerbatimArguments = true
  return execOptions
}

try {
  const tool = tl.tool(tl.which('npm', true))
  tool.arg(["install"])
  const npmProcess = tool.execSync(getDefaultExecOptions())

  if(npmProcess.code !== 0) {
    tl.debug(npmProcess)
    throw new Error('Unable to install dependencies')
  }

  const nodeTool = tl.tool(tl.which('node', true))
  nodeTool.arg(["script.js"])

  let runOpts = getDefaultExecOptions()
  const outputPath = join(tl.getPathInput('outputPath', true, true), 'cucumber.html')
  runOpts.env = {
    "JSON_DIR": tl.getPathInput('jsonDir', true, true),
    "OUTPUT_PATH": outputPath,
    "REPORT_SUITES_AS_SCENARIOS": tl.getBoolInput('reportSuiteAsScenarios', true),
    "RAW_METADATA": tl.getInput('metadata', false),
    "THEME": tl.getInput('theme', true),
    "REPORT_TITLE": tl.getInput('title', false),
    "REPORT_NAME": tl.getInput('name', false)
  }
  const nodeProcess = nodeTool.execSync(runOpts)

  if(nodeProcess.code !== 0) {
    tl.debug(nodeProcess)
    throw new Error('Unable to run script')
  }

  tl.addAttachment('cucumber.report', 'cucumber_report.html', outputPath)
} catch (e) {
  tl.warning(e)
  tl.setResult(tl.TaskResult.SucceededWithIssues)
}
