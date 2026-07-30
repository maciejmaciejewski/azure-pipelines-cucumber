## Context

See `proposal.md` - Why, for the root cause: `tab.ts`'s `sanitizeImageLinks` replaces each `screenshots/<name>` reference in the report HTML with the screenshot attachment's raw `_links.self.href` REST URL, and the browser loads that via a plain `<img src>`. That is a cross-origin sub-resource fetch to `dev.azure.com`; the attachment-content endpoint doesn't return a browser-trusted image `Content-Type`, so CORB blocks the response before it reaches the page. The report HTML itself doesn't hit this problem because it's fetched via `taskClient.getAttachmentContent()` / `rmClient.getTaskAttachmentContent()` - an authenticated REST call the SDK makes on the extension's behalf, not a browser sub-resource request.

`sanitizeImageLinks` is called from two places with different REST clients:
- `BuildReportTab.findAttachment` (`DT_Client.TaskHttpClient`, `taskClient.getAttachmentContent(projectId, hubName, planId, timelineId, recordId, type, name)`)
- `ReleaseReportTab.findfindAttachment` (`RM_Client.ReleaseHttpClient`, `rmClient.getTaskAttachmentContent(projectId, releaseId, environmentId, attempt, planId, recordId, type, name)`)

Both already fetch the HTML this same way; only the screenshot path needs to change.

## Goals / Non-Goals

**Goals:**
- Screenshots render in the report tab without any cross-origin `<img>` fetch of a `dev.azure.com` URL.
- No change to `PublishCucumberReport` task behavior, `cucumber-html-reporter` options, or the size/structure of published report and screenshot attachments.
- Both Build and Release report tabs get the fix, since both call the same `sanitizeImageLinks` method.

**Non-Goals:**
- Not reverting `noInlineScreenshots` to `false` or otherwise changing how the reporter generates the HTML/screenshot files on the agent.
- Not addressing report tab performance for very large screenshot counts beyond graceful per-screenshot failure handling (see Risks).
- Not changing the `windows`/`unix` path-matching regexes' pattern-matching approach - only what they substitute in.

## Decisions

**Fetch screenshot bytes through the existing authenticated attachment-content clients, then inline as a `data:` URI.**
`sanitizeImageLinks` becomes `async` and, for each screenshot, calls back into the caller-supplied content-fetch function (the same `getAttachmentContent`/`getTaskAttachmentContent` call already used for the HTML) instead of reading `screenshot._links.self.href`. The returned `ArrayBuffer` is base64-encoded client-side and substituted into the report text as `data:image/png;base64,...` (or `image/gif` when the attachment name ends in `.gif`, matching the two formats `cucumber-html-reporter` writes).

Alternatives considered:
- *Fix the attachment-content endpoint's `Content-Type` header* - not viable, that endpoint is part of the Azure DevOps platform, not this extension.
- *Request the endpoint with `crossorigin`/CORS mode via `fetch()` from the page instead of the SDK client* - doesn't help; CORB keys off the response's declared type regardless of fetch mode, and this would still require the browser to carry auth to a cross-origin endpoint outside the SDK's client, which is the same class of problem, just via `fetch` instead of `<img>`.
- *Revert `noInlineScreenshots` to `false`* - fixes rendering but reintroduces the large-HTML/JSON problem the original `noInlineScreenshots: true` change (PR #20) was meant to solve. Rejected per explicit ask to preserve that size win.

**Pass a client-specific content-fetch callback into `sanitizeImageLinks` rather than duplicating the method per tab type.**
`BaseReportTab.sanitizeImageLinks(reportText, screenshotList, fetchContent)` takes `fetchContent: (screenshot) => Promise<ArrayBuffer>`. `BuildReportTab` and `ReleaseReportTab` each pass a closure around their own already-instantiated REST client, keeping the shared substitution/base64 logic in the base class and the client-specific call signature in each subclass, matching the existing split of responsibilities in `tab.ts`.

**Base64-encode `ArrayBuffer` in chunks rather than a single `String.fromCharCode.apply`.**
`String.fromCharCode.apply(null, largeTypedArray)` can exceed the JS engine's argument-count limit for large screenshots. Encoding in fixed-size chunks (e.g. 32KB) before `btoa` avoids that failure mode for larger screenshots without adding a dependency.

## Risks / Trade-offs

- [Risk] Each screenshot now requires its own REST round trip to fetch bytes (previously the browser fetched images directly, in parallel, without going through the extension's JS at all) → [Mitigation] Fetch all screenshots for a report concurrently (`Promise.all`) rather than sequentially, so wall-clock time stays close to the slowest single fetch rather than the sum of all of them.
- [Risk] A report with many or very large screenshots increases browser memory use, since every screenshot's bytes and its base64 string are held in memory as part of the patched report string → [Mitigation] Accepted for now; matches the existing `noInlineScreenshots: true` design intent of keeping this cost in the viewer's browser rather than in the stored report artifact. Not measured against a specific screenshot-count ceiling in this change.
- [Risk] A single screenshot's fetch failing must not break the whole report → [Mitigation] Per the `report-screenshot-rendering` spec's graceful-degradation requirement, wrap each screenshot's fetch-and-substitute step so a failure is logged and skipped (leaving that one reference unresolved) rather than rejecting the whole `sanitizeImageLinks` call.

## Migration Plan

No data migration. This only changes client-side (browser) rendering logic in `src/tab.ts`, shipped as a new extension version. Existing published reports and attachments from prior runs are read the same way (attachment list + content), so previously published builds/releases render correctly under the new tab code without needing to be re-run.

Rollback is a straightforward extension version revert if needed; no on-disk or service-side state depends on this change.
