const { generate } = require('cucumber-html-reporter')
const fs = require('fs')
const path = require('path')
const rawMetadata = process.env.RAW_METADATA

const jsonDir = process.env.JSON_DIR
console.log(`Checking for JSON files in: ${jsonDir}`)

// Check if directory exists and has JSON files
if (!fs.existsSync(jsonDir)) {
  console.log(`Directory does not exist: ${jsonDir}`)
  process.exit(0)
}

const jsonFiles = fs.readdirSync(jsonDir).filter(file => file.endsWith('.json'))
console.log(`Found ${jsonFiles.length} JSON files in directory`)

if (jsonFiles.length === 0) {
  console.log('No JSON files found. Creating empty report...')
  // Create a simple empty HTML report
  const emptyHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Cucumber Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .empty { color: #666; text-align: center; margin-top: 100px; }
    </style>
</head>
<body>
    <div class="empty">
        <h2>No Cucumber Test Results Found</h2>
        <p>No JSON files were found in the specified directory.</p>
        <p>Directory: ${jsonDir}</p>
    </div>
</body>
</html>`
  
  fs.writeFileSync(process.env.OUTPUT_PATH, emptyHtml)
  console.log(`Empty report created at: ${process.env.OUTPUT_PATH}`)
  process.exit(0)
}

const reportOpts = {
  name: process.env.REPORT_NAME,
  brandTitle: process.env.REPORT_TITLE,
  ...(rawMetadata && {
    metadata: JSON.parse(rawMetadata)
  }),
  storeScreenshots: true,
  noInlineScreenshots: true,
  scenarioTimestamp: true,
  theme: process.env.THEME,
  reportSuiteAsScenarios: process.env.REPORT_SUITES_AS_SCENARIOS,
  launchReport: false,
  output: process.env.OUTPUT_PATH,
  jsonDir: process.env.JSON_DIR
}

try {
  generate(reportOpts)
  console.log(`Report generated successfully at: ${process.env.OUTPUT_PATH}`)
} catch (error) {
  console.error('Error generating report:', error.message)
  process.exit(1)
}
