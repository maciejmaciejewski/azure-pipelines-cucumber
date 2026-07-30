## Context

See `proposal.md` - Why for the customer-reported validation failure and the dependency history that motivates this change. Relevant facts from the current codebase:

- `tasks/PublishCucumberReport/task.json` currently declares `Node20_1`, `Node16`, `Node14`, `Node12`, `Node10`, and bare `Node` handlers, all targeting `index.js`.
- `Node` (no suffix) is Azure Pipelines' original Node 6 handler; `Node12`/`Node14` are not handler names the agent recognizes.
- `tasks/PublishCucumberReport/package.json` depends on `glob@^13.0.6`, which declares `"engines": { "node": "18 || 20 || >=22" }` (verified in `node_modules/glob/package.json`) - `Node10`/`Node16` fall outside that range.
- `minimumAgentVersion` is currently `"2.115.0"`, set long before any of the newer handlers existed.

## Goals / Non-Goals

**Goals:**
- Declare only `Node20_1` and `Node24` execution handlers in `task.json`.
- Set `minimumAgentVersion` to a value that is actually correct for those two handlers (not guessed).
- Confirm `index.js` runs correctly under both Node 20 and Node 24 before publishing.

**Non-Goals:**
- No change to task inputs, outputs, or `index.js` logic itself.
- No change to the `reporter/` sub-project or its dependencies.
- Not attempting to preserve compatibility with agents that only support `Node16` or older - that support is intentionally dropped (see proposal.md - Impact).

## Decisions

- **Keep both `Node20_1` and `Node24`, not just `Node24`.** `Node24` is the newest handler and may not yet be available on all hosted/self-hosted agent images; `Node20_1` is the safer floor that satisfies `glob`'s engine range (`20` is explicitly listed) while still being far newer than the deprecated `Node16`. Listing both lets the agent pick the highest one it supports.
- **Do not keep `Node16` "just in case."** It falls outside `glob@^13`'s declared engine range, and Node 16 itself is EOL upstream. Keeping it back would reintroduce an unverified runtime rather than protect anyone.
- **`minimumAgentVersion` must be looked up, not guessed.** The exact agent version that introduced `Node20_1` support (and, separately, `Node24` support) is a fact about the `azure-pipelines-agent` project's release history, not something to state from memory. Implementation must confirm the correct value against the agent's release notes/changelog before publishing, and use whichever is required for `Node20_1` (the lower of the two, since `Node24` is additive) as the floor - the task still validates for orgs that block Node 6 as long as `Node20_1` is present, so implementation should not block on `Node24` version discovery if it's harder to pin down.

## Risks / Trade-offs

- [Self-hosted agents on old versions lose the ability to run this task entirely, with no fallback handler] → Mitigation: call this out explicitly as a **BREAKING** change in the proposal and release notes so affected users can upgrade their agent ahead of time.
- [`glob@^13`'s declared engine range doesn't guarantee `index.js` and its other dependencies are fully exercised on Node 24 yet, since it's a newer runtime] → Mitigation: run the existing end-to-end smoke test (report generation, HTML attachment upload, screenshot handling, `tfx extension create` packaging) under both Node 20 and Node 24 before publishing, per proposal.md.
- [Guessing `minimumAgentVersion` could either lock out agents that would have worked fine, or (worse) under-set it so agents without `Node20_1` support silently fail elsewhere] → Mitigation: task requires looking up the real value rather than asserting one.

## Open Questions

- Exact agent version numbers that first shipped `Node20_1` and `Node24` support - to be confirmed during implementation against `azure-pipelines-agent`/`azure-pipelines-tasks` release notes; does not change the approach (still `minimumAgentVersion` = whatever `Node20_1` requires).
