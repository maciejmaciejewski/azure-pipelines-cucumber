# reporter-dependency-packaging Specification

## Purpose

Ensures the PublishCucumberReport task can render a Cucumber HTML report without reaching out to the npm registry at pipeline-run time, by having all of the report generator's dependencies installed and packaged into the extension when it is built and published, not when a consumer's pipeline executes the task.

## Requirements

### Requirement: Task runtime performs no dependency installation
The `PublishCucumberReport` task SHALL generate the Cucumber HTML report without invoking any package manager (e.g. `npm install`) during task execution.

#### Scenario: Task runs on an agent without npm registry access
- **WHEN** the `PublishCucumberReport` task executes on an agent that cannot reach the npm registry
- **THEN** the task still successfully generates the Cucumber HTML report and attaches it to the build/release

#### Scenario: Task runs on an agent with npm registry access
- **WHEN** the `PublishCucumberReport` task executes on an agent that can reach the npm registry
- **THEN** the task does not make any npm registry requests before generating the report

### Requirement: Extension package includes reporter dependencies
The packaged extension (`.vsix`) SHALL include the report generator's dependencies already installed, so they are available to the task without further installation.

#### Scenario: Extension is built and packaged
- **WHEN** the extension is built and packaged via the publish pipeline
- **THEN** the resulting `.vsix` contains the report generator script together with its installed dependencies

### Requirement: Report output is unchanged
Moving dependency installation to build time SHALL NOT change the generated report's content, options, or the task's existing inputs.

#### Scenario: Existing task inputs still produce equivalent output
- **WHEN** a pipeline runs `PublishCucumberReport` with the same `jsonDir`, `outputPath`, `theme`, `reportSuiteAsScenarios`, `metadata`, `name`, and `title` inputs as before this change
- **THEN** the generated HTML report is equivalent in content and structure to what the task produced prior to this change
