# Azure Pipelines Cucumber Reporter

Azure DevOps extension that provides a task for publishing Cucumber report in a HTML format and embeds it into a Build and Release pages.

## Configuration

This extension reads Cucumber run report saved in JSON format. In order to get such file one needs to set up formater in Cucumber runner as following.

```
--format=json:./results/cucumber.json
```

Once the file is saved it can be useda as an input to the Publish task.

### Parameters

`jsonDir` - path where task looks for JSON files and then combines them into single report. This parameter supports wildcards, if used all files will get consolidated into single report. Use this option with caution as the task will go through all located JSON files and non-cucumber files reporter will throw an error.

`outputPath` - path where task saves output HTML report

`metadata` - optional custom metadata in JSON format that is added to the report

`theme` - theme used for the report

`name` - optional name of the report

`title` - optional title of the report

### Example YAML setup

```YAML
steps:
- task: PublishCucumberReport@1
  displayName: 'Publish Cucumber Report'
  inputs:
    jsonDir: ./results/cucumber
    outputPath: ./results/cucumber
    metadata: |
     {
       "ApplicationUrl": "$(App.Url)"
     }
    name: 'Functional Tests'
    title: API
```

## Additional notes

For generating HTML report task uses [cucumber-html-reporter](https://www.npmjs.com/package/cucumber-html-reporter).
Because of that it is required to have NodeJS installed on AzureDevOps Agent machine. In order to do it, simply add below snippet to your pipeline.

```YAML
- task: NodeTool@0
  displayName: 'Install Node 12.x'
  inputs:
    versionSpec: 12.x
```
