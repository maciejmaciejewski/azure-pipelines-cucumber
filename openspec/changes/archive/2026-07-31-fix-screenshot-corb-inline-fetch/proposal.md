## Why

Screenshots attached to failed Cucumber steps no longer render in the Build/Release report tab, even though they are captured, embedded in `cucumber.json`, written to disk by `cucumber-html-reporter`, and successfully uploaded as `cucumber.screenshot` build attachments. Browser DevTools shows the actual failure: `Response was blocked by CORB (Cross-Origin Read Blocking)`. The report tab (`tab.ts`) patches each screenshot's relative path in the report HTML with a raw `dev.azure.com` attachment-content URL and lets the browser load it directly via a plain `<img src>`. That is a cross-origin sub-resource fetch, and the attachment-content endpoint does not return a browser-trusted image `Content-Type` for it, so Chromium-based and WebKit browsers refuse to hand the bytes to the page. This reproduces identically on Linux-hosted and Windows self-hosted agents, across Chrome, Edge, and Safari - it is not platform-specific.

The report's HTML file already fetches its own content through the authenticated `taskClient.getAttachmentContent()` REST call rather than a raw URL, and that path is unaffected by CORB. Screenshots take a different, unauthenticated-fetch path today, which is the root cause.

## What Changes

- `tab.ts` will fetch each screenshot's bytes via the same authenticated `getAttachmentContent()` REST client already used for the report HTML, instead of substituting a raw `dev.azure.com` attachment URL into the report text.
- Each screenshot's bytes will be base64-encoded and inlined as a `data:image/png;base64,...` URI directly in the report HTML before it is handed to the display iframe, eliminating the cross-origin image sub-resource fetch entirely.
- No changes to `index.js`, `script.js`, `cucumber-html-reporter` options (`storeScreenshots`, `noInlineScreenshots` stay `true`), the screenshot file glob, or attachment upload - the report artifact and JSON on disk stay exactly as small as they are today. Only the browser-side rendering step changes.

## Capabilities

### New Capabilities
- `report-screenshot-rendering`: The Cucumber report viewer (Build and Release tabs) must render step screenshots reliably in-browser regardless of the hosting agent's OS or the viewer's browser, without depending on direct cross-origin fetches of Azure DevOps attachment URLs.

### Modified Capabilities
_None - no existing capability in `openspec/specs/` covers report screenshot display today._

## Impact

- **Affected files**: `src/tab.ts` (`sanitizeImageLinks` and its callers in `BaseReportTab`/`BuildReportTab`/`ReleaseReportTab`).
- **Affected systems**: Only the extension's client-side report tab rendering. The `PublishCucumberReport` task, its dependencies, and generated report/JSON artifacts are unchanged.
- **Dependencies**: none added or removed.
- **Risk to watch**: fetching and base64-encoding every screenshot client-side adds a per-attachment REST round trip and memory overhead in the browser when the tab loads; should stay well within reason for typical screenshot counts/sizes, but very large screenshot sets could make the report tab slower to become interactive (not measured yet).
