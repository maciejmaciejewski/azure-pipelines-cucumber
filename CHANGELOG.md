# Changelog

All notable changes to this project will be documented in this file.

## [1.0.17] - 2026-07-30

### Fixed
- **Screenshots not rendering in the report tab**: the Build/Release report tab loaded step screenshots by pointing an `<img>` tag directly at the Azure DevOps attachment REST endpoint. Browsers blocked that response via CORB (Cross-Origin Read Blocking), since the endpoint doesn't return a browser-trusted image `Content-Type` - screenshots were captured, uploaded, and correctly linked, but silently failed to display. Reproduced identically on Windows and Linux agents, across Chrome, Edge, and Safari. Screenshots are now fetched through the same authenticated attachment-content REST call already used for the report HTML, base64-encoded, and inlined as `data:` URIs before the report is rendered, avoiding the cross-origin fetch entirely. Report and attachment sizes on disk are unchanged.

### Changed
- Bumped version to 1.0.17.

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
