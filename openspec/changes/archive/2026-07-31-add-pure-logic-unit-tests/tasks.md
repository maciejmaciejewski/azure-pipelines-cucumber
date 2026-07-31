## 1. Remove bump-version utility

- [x] 1.1 Delete `utils/bump-version.js`
- [x] 1.2 Remove the `bump-version` script from the root `package.json` (and drop it from the `build-publish` script chain)

## 2. Fix hook ordering and prepare index.js for testing

- [x] 2.1 Fix `unifyCucumberReport` in `tasks/PublishCucumberReport/index.js` so `before` hooks are prepended and `after` hooks are appended around the original `steps`, instead of both being pushed onto the end
- [x] 2.2 Export `unifyCucumberReport` via `module.exports` from `index.js`
- [x] 2.3 Guard the `main()` invocation with `if (require.main === module) main()` so requiring the module no longer runs the task for real

## 3. Extract tab.ts pure helpers

- [x] 3.1 Create `src/report-utils.js` containing `arrayBufferToBase64`, `screenshotMimeType`, and the string-substitution logic currently inside `sanitizeImageLinks`
- [x] 3.2 Update `src/tab.ts` to import from `./report-utils` and delegate to it, removing the now-duplicated logic from `BaseReportTab`
- [x] 3.3 Run `npm run build` and confirm `tsc` compiles cleanly with the new import

## 4. Add unit tests

- [x] 4.1 Add `tasks/PublishCucumberReport/index.test.js` covering `unifyCucumberReport`: before-only, after-only, before+after, and no-hooks scenarios (per `specs/report-step-ordering`), plus wildcard vs. non-wildcard save-path behavior
- [x] 4.2 Add `src/report-utils.test.js` covering `arrayBufferToBase64` (including chunk-boundary sizes), `screenshotMimeType` (`.gif` vs. other extensions, case-insensitivity), and the `sanitizeImageLinks` string-substitution logic (Windows and Unix screenshot path forms)
- [x] 4.3 Split `index.js`'s `main()` into a thin entry point and a `run(deps)` core taking its `azure-pipelines-task-lib` surface as a parameter
- [x] 4.4 Add `tasks/PublishCucumberReport/main.test.js` covering `run(deps)` with hand-written fakes: successful end-to-end run (install, unify, generate, upload report + screenshot), dependency-install failure, report-generation failure, and wildcard input consolidation

## 5. Wire tests into npm scripts and CI

- [x] 5.1 Add `"test": "node --test *.test.js"` to `tasks/PublishCucumberReport/package.json`
- [x] 5.2 Add `"test": "node --test src/*.test.js"` to the root `package.json`
- [x] 5.3 Add an `Npm@1` test step for the root package to `azure-pipelines.yaml`, after dependency install and before the build/package steps
- [x] 5.4 Add an `Npm@1` test step for `tasks/PublishCucumberReport` to `azure-pipelines.yaml`, after its dependency install and before packaging

## 6. Verify

- [x] 6.1 Run both test suites locally and confirm they pass
- [x] 6.2 Confirm `npm run build` still succeeds after the `tab.ts` extraction
- [x] 6.3 Confirm the CI pipeline steps run the new tests before packaging
