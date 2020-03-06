const { generate } = require('cucumber-html-reporter')
const rawMetadata = process.env.RAW_METADATA

const reportOpts = {
  name: process.env.REPORT_NAME,
  brandTitle: process.env.REPORT_TITLE,
  ...(rawMetadata && {
      metadata: JSON.parse(rawMetadata)
  }),
  theme: process.env.THEME,
  reportSuiteAsScenarios: process.env.REPORT_SUITES_AS_SCENARIOS,
  launchReport: false,
  output: process.env.OUTPUT_PATH,
  jsonDir: process.env.JSON_DIR
}

generate(reportOpts)
