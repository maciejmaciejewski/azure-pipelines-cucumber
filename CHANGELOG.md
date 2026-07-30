# Changelog

All notable changes to this project will be documented in this file.

## [1.0.18] - 2026-07-31

### Fixed
- **Pipeline validation failure with "Disable Node 6 tasks" enabled**: `PublishCucumberReport` declared a bare `Node` execution handler - Azure Pipelines' original, unsuffixed handler name for Node.js 6 - alongside unrecognized `Node12`/`Node14` entries and the deprecated `Node10`/`Node16` handlers. Organizations that enable "Disable Node 6 tasks" failed pipeline validation with `references task 'PublishCucumberReport' ... contains an execution handler that relies on NodeJS version '6'` before the task could even run.

### Changed
- **BREAKING**: `task.json`'s `execution` block now declares only the `Node20_1` and `Node24` handlers; the `Node` (Node 6), `Node10`, `Node12`, `Node14`, and `Node16` handlers have been removed. Self-hosted agents older than the new `minimumAgentVersion` can no longer run this task at all - previously they could fall back to an older handler.
- Raised `minimumAgentVersion` from `2.115.0` to `2.214.1`, the minimum agent version that supports the `Node20_1` handler.
- Bumped version to 1.0.18.

## [1.0.17] - 2026-07-30

### Fixed
- **Screenshots not rendering in the report tab**: the Build/Release report tab loaded step screenshots by pointing an `<img>` tag directly at the Azure DevOps attachment REST endpoint. Browsers blocked that response via CORB (Cross-Origin Read Blocking), since the endpoint doesn't return a browser-trusted image `Content-Type` - screenshots were captured, uploaded, and correctly linked, but silently failed to display. Reproduced identically on Windows and Linux agents, across Chrome, Edge, and Safari. Screenshots are now fetched through the same authenticated attachment-content REST call already used for the report HTML, base64-encoded, and inlined as `data:` URIs before the report is rendered, avoiding the cross-origin fetch entirely. Report and attachment sizes on disk are unchanged.

### Security
- Bumped `PublishCucumberReport`'s runtime dependencies to remediate `npm audit` findings (13 advisories in the task, 10 in its bundled reporter), including a **critical** prototype-pollution flaw in `mockery` (pulled in transitively by an outdated `azure-pipelines-task-lib`) and a high-severity `brace-expansion` DoS (GHSA-mh99-v99m-4gvg): `azure-pipelines-task-lib` `^3.3.1` → `^5.278.0`, `fs-extra` `^8.1.0` → `^11.4.0`, `glob` `^7.2.0` → `^13.0.6`. Removed `globby` entirely (ESM-only from v10+, incompatible with the task's CommonJS runtime) in favor of the already-present `glob` package's own `glob()` function - behavior is unchanged.
- Added `overrides` pinning `brace-expansion` (task and reporter), plus `uuid` and `semver` (reporter), to patched versions where `cucumber-html-reporter@7.2.0`'s pinned `@cucumber/cucumber@9.1.2` still resolved vulnerable transitive versions.
- Bumped the root build-tooling dependency `tfx-cli` `0.18.0` → `0.23.4` (dev-only, not bundled into the extension).

### Changed
- **Reporter dependency packaging**: `cucumber-html-reporter` and its dependencies are now installed once at extension build/package time (via a new CI step) instead of being installed by the `PublishCucumberReport` task on every pipeline run.
- The task no longer performs any `npm install` (or other network calls) at runtime - report generation now works on agents without npm registry access.
- Bumped version to 1.0.17.

### Notes
- This increases the packaged extension size (`.vsix` grows from ~3 MB to ~19.5 MB) since the reporter's dependencies now ship with the extension. Report output, task inputs, and behavior are otherwise unchanged.

## [1.0.16] - 2025-08-18

### Fixed
- **Node.js Compatibility**: Fixed compatibility issue with older Node.js versions by downgrading `globby` from ^10.0.2 to ^8.0.2
- **Syntax Error**: Resolved "Unexpected token {" error that occurred in older Node.js environments
- **Async/Await**: Updated task code to properly handle async `globby` operations

### Changed
- Updated `globby` dependency to version 8.x for better Node.js compatibility
- Modified task execution to use async/await pattern
- Bumped version to 1.0.16

## [1.0.15] - Previous Release

### Added
- Linux compatibility for Publish Cucumber Report task

### Changed
- Various improvements and bug fixes
