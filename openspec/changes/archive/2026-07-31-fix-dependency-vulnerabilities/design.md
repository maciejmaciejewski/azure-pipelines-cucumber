## Context

Three independent npm projects ship or support this extension: the root (build tooling only, not bundled into the `.vsix`), `tasks/PublishCucumberReport` (bundled — the task runtime), and `tasks/PublishCucumberReport/reporter` (bundled — invoked by the task via a runtime `npm install` + `node script.js`, per `getDefaultExecOptions`/`main()` in `index.js`). No `package-lock.json` files are committed (all three are gitignored) and CI (`azure-pipelines.yaml`) runs plain `npm install` at build time for the root and the task, so `package.json` ranges are the actual source of truth for what gets resolved and packaged — there's no separate lockfile to keep in sync. See proposal.md - Why for the vulnerability findings that motivated this.

## Goals / Non-Goals

**Goals:**
- Eliminate all `npm audit` findings in the two trees that ship inside the `.vsix` (task + reporter), and in the root build tooling.
- Preserve exact runtime behavior of the task (file discovery, report generation, attachment upload).

**Non-Goals:**
- No new features, no task.json input/output changes.
- Not attempting to remove the reporter's runtime `npm install` step or otherwise restructure how the reporter is invoked — out of scope for a dependency/security fix.
- Not chasing dependency currency for packages `npm audit` didn't flag (e.g., `typescript`, `@types/node`).

## Decisions

**Replace `globby` with the already-present `glob` package instead of upgrading `globby`.**
`globby` is ESM-only from v10 onward, and the task's `index.js` uses CommonJS `require()`. Upgrading `globby` in place would break the task at runtime with `ERR_REQUIRE_ESM`. The task already depended on `glob` (for `hasMagic`), and `glob@13` still ships a CJS `require` export condition alongside ESM, has zero `npm audit` findings, and exposes an async `glob()` function with equivalent semantics. Verified both call sites (`*.json` and `screenshots/**.png` patterns) return identical file sets under `glob` vs. the old `globby`. This also reduces the dependency count (one glob library instead of two).

**Use `overrides` to force patched transitive packages rather than waiting on upstream releases or accepting a downgrade.**
Two cases forced this:
- `azure-pipelines-task-lib@5.278.0` (latest) still resolves `minimatch@^3.1.5` internally, which pulls a pre-patch `brace-expansion` (GHSA-mh99-v99m-4gvg, published days before this fix — first patched in `5.0.8`). There is no newer `azure-pipelines-task-lib` release that changes this.
- `cucumber-html-reporter@7.2.0` is already the latest published version, but it pins `@cucumber/cucumber@9.1.2` exactly, which drags in old `uuid`, `semver`, and `glob`/`minimatch`/`brace-expansion`. `npm audit fix --force` would downgrade `cucumber-html-reporter` to `5.0.2` — a real regression — to "fix" this.
`brace-expansion`, `uuid`, and `semver` are small, stable-API utility libraries; forcing newer majors via `overrides` doesn't change how their consumers call them. Confirmed `azure-pipelines-task-lib`, `cucumber-html-reporter`, and `tfx-cli` all still load and run correctly (task ran end-to-end; `generate()` produced a valid report; `tfx extension create` packaged successfully) with the overrides applied. Also confirmed the `@cucumber/cucumber` tree pulled in by `cucumber-html-reporter` is only referenced from that package's own test fixtures, never from its actual `generate()` code path — so even the unfixed nodes we didn't override were never reachable at runtime; the overrides remove them from the tree anyway so a manifest-based scanner won't flag them.

**Accept the `azure-pipelines-task-lib` major bump (`^3.3.1` → `^5.278.0`) and `fs-extra` major bump (`^8.1.0` → `^11.4.0`).**
Both packages kept the narrow API surface this task actually uses (`tl.tool`, `tl.which`, `tl.getPathInput`, `tl.getInput`, `tl.getBoolInput`, `tl.addAttachment`, `tl.warning`, `tl.setResult`, `ToolRunner.execSync`; `ensureDirSync`, `readFileSync`, `writeFileSync`) stable across majors. Verified by running `index.js` directly with real env vars simulating an Azure Pipelines agent context — same debug log shape, same success/warning behavior, no crashes.

**Bump `tfx-cli` in the root `package.json` even though it's dev-only tooling not bundled into the `.vsix`.**
CI's `TfxInstaller@5` pipeline task installs its own `tfx-cli` for the actual packaging step, so the root devDependency mainly matters for local `npm run package`/`gallery-publish`. Still worth fixing for local build hygiene; confirmed `npm run build` and `npm run package` both succeed unchanged after the bump.

## Risks / Trade-offs

- **[Risk]** `overrides` forces dependency versions the upstream authors didn't test against their package → **Mitigation**: limited to small, stable utility libraries (`brace-expansion`, `uuid`, `semver`) with narrow, unchanged public APIs; verified end-to-end behavior after applying.
- **[Risk]** Major version bumps (`azure-pipelines-task-lib`, `fs-extra`, `glob`) could subtly change behavior not covered by manual smoke tests → **Mitigation**: exercised the full task flow (file discovery, report unification, report generation, attachment upload, screenshot discovery) with real fixtures before and after; compared `glob` vs `globby` output directly for both patterns in use.
- **[Trade-off]** No automated regression test suite exists for this task, so future dependency bumps will need the same manual verification approach until one exists — not addressed here to keep this change focused on the vulnerability fix.
