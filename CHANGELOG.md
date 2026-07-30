# Changelog

All notable changes to this project will be documented in this file.

## [1.0.17] - 2026-07-30

### Changed
- **Reporter dependency packaging**: `cucumber-html-reporter` and its dependencies are now installed once at extension build/package time (via a new CI step) instead of being installed by the `PublishCucumberReport` task on every pipeline run.
- The task no longer performs any `npm install` (or other network calls) at runtime — report generation now works on agents without npm registry access.
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
