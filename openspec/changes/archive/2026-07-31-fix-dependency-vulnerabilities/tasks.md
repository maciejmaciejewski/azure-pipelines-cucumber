## 1. Task runtime dependencies (`tasks/PublishCucumberReport`)

- [x] 1.1 Bump `azure-pipelines-task-lib` `^3.3.1` → `^5.278.0`
- [x] 1.2 Bump `fs-extra` `^8.1.0` → `^11.4.0`
- [x] 1.3 Remove `globby` dependency; bump `glob` `^7.2.0` → `^13.0.6`
- [x] 1.4 Update `index.js` to use `glob`'s `glob()` function in place of the two `globby()` call sites
- [x] 1.5 Add `overrides.brace-expansion: ^5.0.9` to force a patched transitive version
- [x] 1.6 Verify `npm audit` reports 0 vulnerabilities in this project

## 2. Reporter dependencies (`tasks/PublishCucumberReport/reporter`)

- [x] 2.1 Add `overrides` pinning `brace-expansion: ^5.0.9`, `uuid: ^11.1.1`, `semver: ^7.7.2`
- [x] 2.2 Verify `npm audit` reports 0 vulnerabilities in this project

## 3. Root build tooling

- [x] 3.1 Bump `tfx-cli` `0.18.0` → `0.23.4`
- [x] 3.2 Add `overrides.brace-expansion: ^5.0.9`
- [x] 3.3 Verify `npm audit` reports 0 vulnerabilities in this project

## 4. Verification

- [x] 4.1 Confirm `glob` produces identical results to the old `globby` for both patterns in use (`*.json`, `screenshots/**.png`)
- [x] 4.2 Run `index.js` end-to-end with real cucumber JSON fixtures and screenshot files; confirm report generation, HTML attachment upload, and screenshot attachment all work unchanged
- [x] 4.3 Run `generate()` from `cucumber-html-reporter` directly with the overridden dependency tree; confirm it produces a valid report
- [x] 4.4 Run `npm run build` and `npm run package` (via bumped `tfx-cli`) and confirm the packaged `.vsix` contains the updated dependency trees and no longer contains `globby`
