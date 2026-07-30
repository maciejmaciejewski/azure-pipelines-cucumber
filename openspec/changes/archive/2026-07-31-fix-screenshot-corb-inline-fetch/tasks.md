## 1. Shared substitution logic in `BaseReportTab`

- [x] 1.1 Add an `arrayBufferToBase64` helper that chunks the input (e.g. 32KB) before `btoa` to avoid argument-limit failures on larger screenshots
- [x] 1.2 Add a helper to pick the data URI MIME type (`image/png` vs `image/gif`) from the screenshot attachment's file extension
- [x] 1.3 Change `sanitizeImageLinks` to `async` and accept a `fetchContent: (screenshot) => Promise<ArrayBuffer>` parameter in place of reading `screenshot._links.self.href`
- [x] 1.4 For each screenshot, await `fetchContent(screenshot)`, base64-encode the result, and replace both the Windows-style (`screenshots\\<name>`) and Unix-style (`screenshots/<name>`) references with the resulting `data:` URI
- [x] 1.5 Wrap each screenshot's fetch-and-substitute step so a failure is logged (`console.log`) and that screenshot's reference is left unresolved, without rejecting the whole `sanitizeImageLinks` call
- [x] 1.6 Fetch all screenshots concurrently (`Promise.all`) rather than sequentially

## 2. Wire up `BuildReportTab`

- [x] 2.1 Update `findAttachment` to `await` the now-async `sanitizeImageLinks` call
- [x] 2.2 Pass a `fetchContent` closure that calls `taskClient.getAttachmentContent(projectId, this.hubName, planId, cucumberReport.timelineId, screenshot.recordId, this.SCREENSHOT_TYPE, screenshot.name)` for a given screenshot

## 3. Wire up `ReleaseReportTab`

- [x] 3.1 Update `findfindAttachment` to `await` the now-async `sanitizeImageLinks` call
- [x] 3.2 Pass a `fetchContent` closure that calls `rmClient.getTaskAttachmentContent(vsoContext.project.id, env.releaseId, env.id, deployStep.attempt, phase.runPlanId, screenshot.recordId, this.SCREENSHOT_TYPE, screenshot.name)` for a given screenshot

## 4. Verification

- [x] 4.1 Build the extension (`npm run build` / existing build script) and confirm `dist/tab.js` compiles without TypeScript errors
- [x] 4.2 Package and install a dev version of the extension against a test Azure DevOps org; run a pipeline with `PublishCucumberReport` against a `cucumber.json` containing at least one embedded screenshot
- [x] 4.3 Open the Build report tab and confirm the screenshot renders with no CORB error in the browser console (check Chrome, Edge, and Safari if available) - validated on Chrome and Safari (Blink and WebKit engines both covered; Edge shares Chrome's Blink engine)
- [x] 4.4 Repeat against a Release environment tab - verified working against a live Release environment
