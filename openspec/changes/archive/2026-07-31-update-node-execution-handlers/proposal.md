## Why

A customer reported that `PublishCucumberReport` fails pipeline validation in Azure DevOps organizations that have enabled "Disable Node 6 tasks": *"references task 'PublishCucumberReport' ... contains an execution handler that relies on NodeJS version '6'"*. The task's `execution` block still declares a bare `"Node"` handler, which is the legacy Node 6 handler (later handlers were given explicit version suffixes: `Node10`, `Node16`, `Node20_1`, `Node24`). It also lists `Node12`/`Node14`, which are not recognized handler names, plus `Node10`/`Node16`, which are both past their upstream LTS end-of-life. Microsoft is deprecating Node 6 org-wide and recommends tasks move to current LTS runtimes.

Separately, the `2026-07-31-fix-dependency-vulnerabilities` change already bumped this task's `glob` dependency to `^13.0.6`, which declares `"engines": { "node": "18 || 20 || >=22" }`. `Node16`/`Node10` fall outside that window, so even without the org setting, those handlers are not a supported runtime for the task's current dependencies.

## What Changes

- **BREAKING**: Remove the `Node` (Node 6), `Node12`, `Node14`, `Node10`, and `Node16` execution handlers from `tasks/PublishCucumberReport/task.json`. Only `Node20_1` and `Node24` remain.
- Raise `minimumAgentVersion` in `task.json` to the lowest agent version that supports the `Node20_1` handler, so agents too old to run any remaining handler fail with a clear, actionable message instead of silently falling back to an unlisted handler.
- Bump the task's `Patch` version (and the extension's `vss-extension.json` version) to publish the fix.
- Verify `index.js` and its dependencies (`azure-pipelines-task-lib`, `fs-extra`, `glob`) run correctly under both Node 20 and Node 24 before publishing.

## Capabilities

### New Capabilities
- `task-node-runtime-support`: The `PublishCucumberReport` task must declare only current, supported Node.js execution handlers and a `minimumAgentVersion` consistent with those handlers, so the task passes validation in organizations that restrict outdated Node execution handlers.

### Modified Capabilities

None.

## Impact

- **Affected files**: `tasks/PublishCucumberReport/task.json`, `vss-extension.json`.
- **Affected systems**: Azure DevOps pipeline validation for any pipeline using this task; self-hosted agents older than the new `minimumAgentVersion` will no longer be able to run this task at all (previously they could fall back to `Node10`/`Node16`/`Node`).
- **Dependencies**: none added or removed; behavior depends on the already-bumped `glob@^13` from the prior vulnerability-fix change continuing to work correctly under Node 20/24.
- **Risk to watch**: dropping `Node10`/`Node16` cuts off any customer running an old self-hosted agent that doesn't yet bundle a `Node20_1`/`Node24` handler. This is a deliberate tradeoff to fix the reported validation failure and stay ahead of Node 6/16 deprecation, but it is a breaking change for that subset of users and should be called out in the release notes.
