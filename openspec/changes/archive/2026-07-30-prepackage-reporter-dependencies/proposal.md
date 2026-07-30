## Why

`PublishCucumberReport@1` runs `npm install` inside `tasks/PublishCucumberReport/reporter/` on every single pipeline execution before it can render a Cucumber JSON report into HTML. This adds install overhead to every run and creates a hard runtime dependency on npm registry access — on agents with restricted or flaky egress, the install can fail, and the task currently swallows that failure (`SucceededWithIssues`) and produces no report at all. The task's other dependencies (`azure-pipelines-task-lib`, `globby`, etc.) are already installed once at CI build/package time; the reporter's dependency (`cucumber-html-reporter`) should follow the same pattern instead of being the one exception installed at runtime.

## What Changes

- Add a CI step to `azure-pipelines.yaml` that runs `npm install` inside `tasks/PublishCucumberReport/reporter/`, mirroring the existing "NPM: Install Task Dependencies" step, before the TFX packaging steps.
- Remove the runtime `npm install` invocation from `tasks/PublishCucumberReport/index.js`'s `main()` — the task will call `node script.js` directly against dependencies that already exist on disk.
- Verify the packaged `.vsix` includes `tasks/PublishCucumberReport/reporter/node_modules` (expected to ride along automatically since `vss-extension.json` already lists the whole `tasks/PublishCucumberReport` folder as one addressable unit) and check the resulting package size, since `cucumber-html-reporter` pulls in `@cucumber/cucumber` as a transitive dependency.
- No changes to report content, the `cucumber-html-reporter@7.2.0` version, task inputs (`jsonDir`, `outputPath`, `theme`, `reportSuiteAsScenarios`, `metadata`, `name`, `title`), or `tab.ts`/report delivery. This is purely a "when do dependencies get installed" change, not a reporting-behavior change.

## Capabilities

### New Capabilities
- `reporter-dependency-packaging`: The Cucumber HTML report generation dependency and its transitive dependencies are installed and packaged into the extension at build/publish time, so the `PublishCucumberReport` task never installs dependencies over the network during a consumer's pipeline run.

### Modified Capabilities
_None — no existing specs in this repository yet; this is the first tracked capability._

## Impact

- **Affected files**: `azure-pipelines.yaml` (new CI step), `tasks/PublishCucumberReport/index.js` (remove runtime install block).
- **Affected systems**: this repo's own build/publish pipeline (one-time install cost moves here); consumer pipelines lose their runtime dependency on npm registry access for this task.
- **Dependencies**: none added or removed — only *when* `cucumber-html-reporter`'s dependency tree is installed changes.
- **Risk to watch**: `.vsix` package size increase from shipping `reporter/node_modules` (needs measuring after implementation, not assumed away here).
