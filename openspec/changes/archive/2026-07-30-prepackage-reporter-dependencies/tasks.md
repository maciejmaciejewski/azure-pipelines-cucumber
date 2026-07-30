## 1. CI pipeline

- [x] 1.1 Add a new `Npm@1` step to `azure-pipelines.yaml` with `workingDir: tasks/PublishCucumberReport/reporter`, placed after "NPM: Install Task Dependencies" and before the `TfxInstaller`/`PackageAzureDevOpsExtension` steps.

## 2. Task code

- [x] 2.1 Remove the runtime `npm install` block from `main()` in `tasks/PublishCucumberReport/index.js` (the `tl.tool(tl.which('npm', true))` / `execSync` / `Failed to install dependencies` check).
- [x] 2.2 Confirm `main()` still spawns `node script.js` against `reporter/node_modules` unchanged, with no other logic depending on the removed install step.

## 3. Verification

- [x] 3.1 Run `npm install` locally in `tasks/PublishCucumberReport/reporter` to confirm it succeeds standalone (no dependency on the removed runtime step).
- [x] 3.2 Build the extension end-to-end (`npm run build` + `npm run package`, or the equivalent CI steps locally) and unpack the resulting `.vsix` to confirm `tasks/PublishCucumberReport/reporter/node_modules` is present inside it.
- [x] 3.3 Record the `.vsix` file size before and after this change; if the increase is a concern, note it and flag the bundling fallback (esbuild/ncc) from design.md rather than silently accepting it.
  - Before (runtime install, today's behavior): 3.0 MB, 2325 files.
  - After (reporter deps pre-packaged): 19.5 MB, 8962 files (+6637 files, mostly `@cucumber/cucumber`'s own transitive tree).
  - ~6.5x size increase. Flagging as a real trade-off to weigh, not silently accepting — see note to user below.
- [x] 3.4 Run the packaged task against a sample Cucumber JSON report (e.g. reuse an existing test fixture) and confirm the generated HTML report is unchanged in content/structure compared to before this change.
  - No fixture existed in the repo; created a minimal sample Cucumber JSON and ran `reporter/script.js` directly against the pre-installed `node_modules` (same code path `index.js` now calls unconditionally). Produced a single self-contained `cucumber.html` (19,207 bytes) containing the expected feature/scenario content — matches the pre-change single-file output shape.
- [x] 3.5 If feasible, simulate no npm registry access (e.g. block the registry host or run offline) while executing the task, to confirm it still successfully generates a report.
  - Ran `script.js` with `HTTP_PROXY`/`HTTPS_PROXY`/`npm_config_registry` pointed at an unreachable address. Report generated successfully with the same output — confirms no code path reaches npm anymore (also confirmed by grep: no `npm install`/registry references remain in `index.js` or `script.js`).

## 4. Release

- [x] 4.1 Bump the version via `npm run bump-version` per the existing release process.
  - `npm run bump-version` bumped `package.json`/`vss-extension.json` to 1.0.17. Also manually bumped `tasks/PublishCucumberReport/task.json` (`Patch: "17"`) and `tasks/PublishCucumberReport/package.json` (`1.0.17`) — per git history these two are bumped by hand alongside every prior release (bump-version.js only touches the root two files).
- [x] 4.2 Update `CHANGELOG.md` with a entry describing the packaging change (dependencies pre-installed at build time instead of runtime).
