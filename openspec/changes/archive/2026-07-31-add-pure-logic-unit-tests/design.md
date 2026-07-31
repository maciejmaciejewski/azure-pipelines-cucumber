## Context

Two separate npm packages exist today with no test tooling at all: the root package (`src/tab.ts`, a browser-side VSS web extension tab) and `tasks/PublishCucumberReport` (a Node script run by the Azure Pipelines agent). Both mix pure logic with logic that genuinely needs a live host (a VSS/DOM environment for the tab, a real agent + `azure-pipelines-task-lib` for the task). Neither file is currently importable in isolation:

- `tasks/PublishCucumberReport/index.js` calls `main()` unconditionally at module load, which shells out `npm install` for real the instant the file is `require`d.
- `src/tab.ts`'s pure helpers live as methods on `BaseReportTab`, which extends `Controls.BaseControl` from the VSS SDK — importing the module pulls in `VSS/Controls` and other ADO SDK modules that don't resolve outside the extension host.

The build agent is pinned to Node 20.x (`azure-pipelines.yaml`), which does not support executing `.ts` files directly (native TS stripping landed later, in Node 22.6+/23.6+ behind a flag, stable in 23.6+).

See proposal.md - Why, for the motivating defect (before/after hook ordering).

## Goals / Non-Goals

**Goals:**
- Make the existing pure logic in `unifyCucumberReport` and the `tab.ts` string/buffer helpers safely importable and unit-testable, with no new runtime dependencies.
- Fix the before/after hook ordering defect and lock the corrected behavior in with a test, per `specs/report-step-ordering`.
- Cover `index.js`'s full task orchestration (dependency install, glob lookup, report generation, attachment upload, and their failure paths), not just `unifyCucumberReport` in isolation.
- Run these tests as a build step ahead of packaging, so a regression fails CI instead of only surfacing after a dev-tagged VSIX is manually inspected.

**Non-Goals:**
- Testing the VSS/DOM-bound parts of `tab.ts` (`setFrameHtmlContent`, `findAttachment`, the REST client calls) — these need a real or heavily mocked ADO host and are out of scope here.
- Any change to `task.json` execution handlers or the extension manifest.

## Decisions

**Test runner: Node's built-in `node:test`, not Jest/Mocha/Vitest.**
The project already avoids extra tooling (no eslint, no bundler beyond `tsc`, hand-rolled scripts). Node 20 (the pinned agent version) ships `node:test` and `node:assert` natively, so this adds zero new dependencies to either `package.json`. Alternative frameworks were considered and rejected as unnecessary weight for straightforward pure-function tests.

**Extracted `tab.ts` helpers land in a plain `.js` file, not `.ts`, written as ES modules and compiled by `tsc` via `allowJs`.**
`arrayBufferToBase64`, `screenshotMimeType`, and the string-substitution logic inside `sanitizeImageLinks` have no dependency on VSS types, so there's nothing TypeScript buys them. But the compiled `tab.js` is loaded in the browser through a real AMD `require(["dist/tab"], ...)` call (see `tab.html`), so `report-utils.js` must itself compile to a proper AMD `define()` module for that loader to resolve it — a plain CommonJS `module.exports` file would silently fail at runtime (the loader wouldn't register it, and `report-utils`'s exports would come back `undefined` inside `tab.js`). Enabling `allowJs` in `tsconfig.json` and writing `report-utils.js` with `export`/`import` syntax lets `tsc` compile it into the same AMD bundle as `tab.ts`, verified by inspecting the emitted `dist/report-utils.js` and `dist/tab.js`. For `node:test` to load the same ES-module source, the root `package.json` also gets `"type": "module"`.

**`index.js` is split into a thin `main()` entry point and a testable `run(deps)` core, rather than testing through `azure-pipelines-task-lib`'s official `mock-run`/`TaskMockRunner` harness.**
`TaskMockRunner.setInput()` just sets `process.env.INPUT_*`, but `azure-pipelines-task-lib` snapshots all `INPUT_*` env vars into an internal vault the first time the library loads in a process, then deletes them from `process.env` — a one-time, process-lifetime event guarded by a `global` flag. That means inputs set after the library's first load are silently ignored, so the official harness only works with one scenario per freshly spawned process, which in turn requires `MockTestRunner`'s child-process spawning (and, to avoid it downloading a matching Node.js binary from nodejs.org on first run, manually pinning `nodePath` to the current interpreter). This is real, working machinery — Microsoft's own tasks use exactly this pattern — but it is meaningfully more complex and slower than the rest of this change's testing approach. Instead, `run(deps)` takes its `tool`/`which`/`getPathInput`/`getInput`/`getBoolInput`/`addAttachment`/`warning`/`setResult`/`TaskResult` surface as a plain parameter object; `main()` calls it with the real `azure-pipelines-task-lib` bound in, and tests call it with small hand-written fakes. This keeps the whole suite on plain `node:test` with no task-lib mocking layer, at the cost of `index.js` no longer calling the library directly from a single top-level function.

**Test files are colocated with source, one per package.**
`tasks/PublishCucumberReport/index.test.js` and `src/report-utils.test.js`, each run via that package's own `npm test` (`node --test <pattern>`), matching the existing split between the two independent `package.json`s.

## Risks / Trade-offs

- [Extracting `tab.ts` helpers changes an existing file's structure] → Behavior is preserved exactly (pure move, no logic change); the existing `report-screenshot-rendering` spec is unaffected since it describes behavior, not implementation.
- [Fixing hook ordering changes the rendered report's step sequence for any consumer relying on the old (incorrect) order] → This is the intended fix; the old order was an unintended side effect of using `.push()`, not a documented or relied-upon contract.
- [`node:test` is less familiar to contributors than Jest/Mocha] → Mitigated by keeping the test surface small and using standard `describe`/`it`/`assert.strictEqual` patterns that read the same way across runners.

## Migration Plan

No runtime migration needed — this only affects build-time verification and one report-content bug fix. Rollout is: land the fix + tests + CI wiring in one change, no feature flag or staged rollout required.
