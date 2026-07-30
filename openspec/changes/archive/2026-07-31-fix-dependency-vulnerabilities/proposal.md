## Why

Users report the extension being blocked due to vulnerabilities. `npm audit` on the packaged task and its reporter sub-project surfaced 13 and 10 advisories respectively, including a **critical** prototype-pollution flaw (`mockery`, pulled in transitively by an outdated `azure-pipelines-task-lib`) and a newly disclosed high-severity `brace-expansion` DoS (GHSA-mh99-v99m-4gvg) reachable through several dependency chains. These are the dependency trees that actually ship inside the `.vsix` and are what a marketplace/security scanner evaluates.

## What Changes

- Bump `tasks/PublishCucumberReport`'s runtime dependencies: `azure-pipelines-task-lib` `^3.3.1` → `^5.278.0`, `fs-extra` `^8.1.0` → `^11.4.0`, `glob` `^7.2.0` → `^13.0.6`.
- Remove the `globby` dependency entirely (it is ESM-only from v10+ and cannot be `require()`'d under the task's CommonJS runtime) and replace its two call sites in `index.js` with the already-present `glob` package's own `glob()` function. Behavior is unchanged — verified the same file sets are matched for both patterns used.
- Add an `overrides` entry pinning `brace-expansion` to `^5.0.9` in the task's `package.json`, since even the latest `azure-pipelines-task-lib` still resolves a pre-patch `brace-expansion` transitively via `minimatch@3.x`.
- Add `overrides` in `tasks/PublishCucumberReport/reporter/package.json` pinning `brace-expansion`, `uuid`, and `semver` to patched versions. `cucumber-html-reporter@7.2.0` is already the latest release, but its pinned `@cucumber/cucumber@9.1.2` drags in vulnerable transitive versions of these utility packages (on a code path that is never exercised by this project's usage of `generate()`).
- Bump the root build-tooling dependency `tfx-cli` `0.18.0` → `0.23.4` and add the same `brace-expansion` override. This is dev-only tooling not bundled into the extension, but is still worth keeping clean.
- No behavior, inputs, outputs, or task contract changes. This is a dependency-currency and vulnerability-remediation change, not a feature or capability change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None — no spec-level behavior changes. This is a pure dependency/security maintenance change (`skip_specs: true`), verified behavior-equivalent by running the report-generation flow end-to-end before and after with real cucumber JSON fixtures and screenshots.

## Impact

- **Affected code**: `package.json` (root), `tasks/PublishCucumberReport/package.json`, `tasks/PublishCucumberReport/index.js`, `tasks/PublishCucumberReport/reporter/package.json`.
- **Affected dependencies**: `azure-pipelines-task-lib`, `fs-extra`, `glob`, `globby` (removed), `tfx-cli`, plus transitive `brace-expansion`/`uuid`/`semver` pins via `overrides`.
- **Systems**: the packaged Azure DevOps extension (`.vsix`) contents for the `PublishCucumberReport` task and its bundled HTML reporter; local/CI build tooling (`tfx-cli`).
- **Risk**: low — all three dependency trees were re-verified to produce `0 vulnerabilities` via `npm audit`, and the task/reporter were smoke-tested end-to-end (report generation, HTML attachment upload, screenshot discovery/attachment, and `tfx extension create` packaging) after the changes.
