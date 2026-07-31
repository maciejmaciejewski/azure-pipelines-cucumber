## Why

The task runtime (`tasks/PublishCucumberReport/index.js`) and the report tab (`src/tab.ts`) contain pure, dependency-light logic that today is only ever exercised by running a real Azure Pipeline and inspecting the generated report by eye. That slow feedback loop already let a real defect through: the `unifyCucumberReport` transform appends `before`/`after` hooks to the end of a scenario's `steps` array instead of placing them in their actual chronological position, so hooks render out of order in the published report. Adding local/CI-runnable unit tests for this logic — starting with the transform that produces this bug — closes that gap without requiring a live Azure DevOps agent or browser host for every check.

## What Changes

- Fix `unifyCucumberReport` in `tasks/PublishCucumberReport/index.js` so `before` hooks are prepended and `after` hooks are appended around the original `steps`, instead of both being pushed onto the end of the array.
- Make `index.js`'s pure logic importable for tests: export `unifyCucumberReport` via `module.exports` and guard the `main()` invocation behind `require.main === module`, so requiring the module for a test no longer triggers a real `npm install` / task execution.
- Split `index.js`'s task orchestration into a thin `main()` entry point and a `run(deps)` core that takes its `azure-pipelines-task-lib` surface as a parameter, so the full flow (dependency install, glob lookup, report generation, attachment/screenshot upload, and each failure path) is testable with plain fakes instead of a real build agent.
- Extract the pure helpers in `src/tab.ts` (`arrayBufferToBase64`, `screenshotMimeType`, the string-substitution logic inside `sanitizeImageLinks`) into a new dependency-free `src/report-utils.js`, imported by `tab.ts`. No behavior change.
- Add unit tests using Node's built-in `node:test` runner (no new dependencies) for `unifyCucumberReport` (hook ordering, wildcard vs. non-wildcard path handling), for `run(deps)`'s full orchestration (success, dependency-install failure, report-generation failure, wildcard consolidation), and for the extracted `report-utils.js` helpers.
- Add a `test` npm script to the root `package.json` and to `tasks/PublishCucumberReport/package.json`, and wire both into `azure-pipelines.yaml` as build steps that run before packaging, so a regression fails the build instead of only surfacing in a manually inspected report.
- Remove `utils/bump-version.js` and its `bump-version` npm script; version bumping is out of scope for this effort and can use `npm version patch` directly.

## Capabilities

### New Capabilities
- `report-step-ordering`: defines the correct ordering of a scenario's `before`/`after` hooks relative to its steps in the unified Cucumber report produced by the publish task.

### Modified Capabilities
- None. The `report-screenshot-rendering` capability's behavior is unaffected — `sanitizeImageLinks` is relocated, not changed.

## Impact

- `tasks/PublishCucumberReport/index.js` — hook-ordering fix, exports/guard for testability.
- `tasks/PublishCucumberReport/package.json` — new `test` script.
- `src/tab.ts` — pure helpers moved out.
- `src/report-utils.js` — new file.
- `package.json` — new `test` script; `bump-version` script removed.
- `utils/bump-version.js` — removed.
- `azure-pipelines.yaml` — new test steps ahead of packaging.
