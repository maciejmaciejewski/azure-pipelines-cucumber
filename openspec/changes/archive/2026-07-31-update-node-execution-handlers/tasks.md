## 1. Research

- [x] 1.1 Look up the minimum `azure-pipelines-agent` version that supports the `Node20_1` execution handler (release notes/changelog), and separately note the minimum version for `Node24` for reference.
  - Confirmed via `microsoft/azure-pipelines-task-lib` `node/docs/minagent.md`: `node20` (Node20_1) handler added in agent 2.214.1; `node24` handler added in agent 3.250.0.

## 2. Update task.json

- [x] 2.1 In `tasks/PublishCucumberReport/task.json`, remove the `Node`, `Node10`, `Node12`, `Node14`, and `Node16` entries from `execution`, leaving only `Node20_1` and `Node24` (both targeting `index.js` with empty `argumentFormat`, matching the existing entries).
- [x] 2.2 Set `minimumAgentVersion` to the value found in 1.1 (the floor required for `Node20_1`): `2.214.1`.
- [x] 2.3 Bump `task.json`'s `version.Patch` to `18`.

## 3. Bump extension version

- [x] 3.1 Bump the `version` field in `vss-extension.json` to `1.0.18`.

## 4. Verify

- [x] 4.1 Run the task's existing end-to-end smoke test (report generation, HTML attachment upload, screenshot handling) under Node 20.
  - Ran `index.js` under Node 20.20.2 (installed via `brew install node@20`) with a sample cucumber.json fixture: exit code 0, `cucumber.html` generated and `cucumber.report` attachment logged.
- [x] 4.2 Repeat the same smoke test under Node 24.
  - Ran `index.js` under Node 24.15.0 (`brew`'s `node@24`): exit code 0, same successful output.
- [x] 4.3 Run `tfx extension create` to confirm the extension still packages successfully.
  - `npm run build` (tsc) then `tfx extension create` produced `MaciejMaciejewski.azure-pipelines-cucumber-1.0.18.vsix` successfully.
- [x] 4.4 Confirm `tasks/PublishCucumberReport/task.json` validates (e.g. via `tfx` task validation or manual JSON schema check) with only `Node20_1`/`Node24` declared.
  - Confirmed via JSON parse: `execution` contains only `Node20_1`/`Node24`, `minimumAgentVersion` is `2.214.1`; also confirmed the packaged `.vsix` bundles the same `task.json`.
