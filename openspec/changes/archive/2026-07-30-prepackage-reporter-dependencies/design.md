## Context

`tasks/PublishCucumberReport/index.js` currently runs `npm install` (cwd = `tasks/PublishCucumberReport/reporter/`) as the first thing `main()` does, before every report generation. `reporter/package.json` declares one dependency, `cucumber-html-reporter@7.2.0`, which itself pulls in `@cucumber/cucumber` as a transitive dependency — a noticeably heavier install than the task's own dependencies (`azure-pipelines-task-lib`, `globby@8`, `glob`, `hat`), which are already installed once at CI build time via the existing "NPM: Install Task Dependencies" step in `azure-pipelines.yaml` (`workingDir: tasks/PublishCucumberReport`) and packaged as-is. See `proposal.md` - Why for the reliability/overhead motivation.

`vss-extension.json` lists `tasks/PublishCucumberReport` as one whole addressable path in its `files` array, with no exclusion of `node_modules`. That's how the task's own pre-installed dependencies already reach the `.vsix` today without any runtime install — the same mechanism should carry `reporter/node_modules` along once it exists before packaging, with no manifest change needed.

## Goals / Non-Goals

**Goals:**
- Eliminate the runtime `npm install` call from `index.js`.
- Have `reporter/`'s dependencies installed once, at CI build/package time, following the same pattern as the task's own dependencies.
- Keep `cucumber-html-reporter@7.2.0` and all current task inputs/behavior exactly as they are.

**Non-Goals:**
- Not switching report libraries (decided against `multiple-cucumber-html-reporter` — see conversation history: it produces a multi-file report incompatible with `tab.ts`'s single-attachment/`iframe.srcdoc` delivery model).
- Not bundling `reporter/script.js` into a single compiled file (esbuild/ncc) — that's a heavier follow-up if plain pre-install turns out to be insufficient (e.g. on package size), not part of this change.
- Not changing `tab.ts`, `task.json` inputs, or the report's visual output.

## Decisions

**Add a sibling CI step, not merge into the existing task-install step.**
`azure-pipelines.yaml` gets a new `Npm@1` step with `workingDir: tasks/PublishCucumberReport/reporter`, placed right after the existing "NPM: Install Task Dependencies" step and before `TfxInstaller`/`PackageAzureDevOpsExtension`. Keeping it as a separate step (rather than a combined install spanning both folders) mirrors the existing separation between the task's own `package.json` and the reporter's `package.json`, and keeps CI logs/failures attributable to the right folder.

**Delete the runtime install block in `index.js`, call `node script.js` unconditionally.**
`main()` drops the `tl.tool(tl.which('npm', true)).arg(['install'])` block and its `execSync`/error check entirely. The rest of `main()` (finding JSON files, `unifyCucumberReport`, spawning `node script.js`, attaching output) is unchanged — `script.js` already only needs `reporter/node_modules` to exist, it never cared how it got there.

**No lockfile added for `reporter/`.**
The task's own `tasks/PublishCucumberReport/package.json` has no committed lockfile either (root `.gitignore` excludes `package-lock.json`), and CI already does a plain `npm install` there. Matching that convention keeps this change minimal; introducing lockfiles for reproducibility is a separate concern outside this change's scope.

**Verify packaging by building and inspecting the `.vsix`, not by assuming it.**
Because `cucumber-html-reporter` pulls in `@cucumber/cucumber`, the size impact is not trivial. Rather than assume the existing `vss-extension.json` `files` entry is sufficient, the implementation must build the extension end-to-end and confirm (a) `reporter/node_modules` is present inside the packaged `.vsix`, and (b) the resulting file size is acceptable. If it isn't picked up automatically, the fallback is to add an explicit `files` entry for `tasks/PublishCucumberReport/reporter/node_modules` in `vss-extension.json`.

## Risks / Trade-offs

- **`.vsix` size growth** from shipping `@cucumber/cucumber` and its own transitive deps inside `reporter/node_modules` → Mitigation: measure the built `.vsix` size as part of this change (task in `tasks.md`); if it's a real problem, the follow-up is bundling (`esbuild`/`ncc`) rather than reverting to runtime install.
- **CI build time increases slightly** (one more `npm install`) → Acceptable trade-off since it replaces N runtime installs (one per consumer pipeline run) with one CI-time install per extension publish.
- **Packaging assumption could be wrong** (tfx might not include `reporter/node_modules` the same way it includes the task's own `node_modules`) → Mitigation: explicitly verified in tasks.md by unpacking the built `.vsix`, not assumed from reading `vss-extension.json` alone.

## Migration Plan

No consumer-facing migration is needed — task inputs and outputs are unchanged, so existing pipelines using `PublishCucumberReport@1` continue to work without any YAML changes on their end. Rollout is just: merge the CI step + code change, publish a new patch version (per `utils/bump-version.js`), verify the published extension's task still generates reports correctly on a real pipeline run before/after comparison.

**Rollback**: if the packaged `.vsix` is materially larger or the reporter fails to run when pre-installed, revert the `index.js` change (restore the runtime `npm install` block) and drop the new CI step — no data or state migration is involved either way.
