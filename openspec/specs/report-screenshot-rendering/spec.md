# report-screenshot-rendering Specification

## Purpose

Ensures step screenshots attached to a published Cucumber report are visible when a user opens the Build or Release report tab in the browser, regardless of the agent OS that produced them or the browser used to view them.

## Requirements

### Requirement: Screenshots render without a direct cross-origin image fetch
The report tab SHALL display each step screenshot referenced in the generated report HTML without requiring the browser to load it via a direct, unauthenticated cross-origin request to an Azure DevOps attachment URL.

#### Scenario: Screenshot displays in the Build report tab
- **WHEN** a published Cucumber report references a screenshot that exists as a `cucumber.screenshot` build attachment
- **THEN** the report tab displays the screenshot's image content to the user

#### Scenario: Screenshot displays in the Release report tab
- **WHEN** a published Cucumber report is viewed from a Release environment tab and references a screenshot that exists as a `cucumber.screenshot` task attachment
- **THEN** the report tab displays the screenshot's image content to the user

#### Scenario: Rendering does not depend on agent OS
- **WHEN** the report and its screenshots were produced on a Windows, Linux, or macOS build agent
- **THEN** the report tab displays the screenshots identically, with no OS-specific rendering difference

### Requirement: Screenshot content is retrieved through the authenticated attachment API
The report tab SHALL retrieve each screenshot's image bytes through the same authenticated REST attachment-content mechanism already used to retrieve the report HTML itself, rather than by pointing an image element directly at the attachment's REST URL.

#### Scenario: Screenshot fetch reuses the authenticated client
- **WHEN** the report tab resolves a screenshot reference in the report HTML
- **THEN** it retrieves the screenshot's bytes via the same authenticated attachment-content REST client call used for the report HTML, and substitutes the result in place of the reference before display

### Requirement: Report and attachment artifacts remain unchanged
Displaying screenshots reliably SHALL NOT require re-inlining screenshot data into the generated report HTML or `cucumber.json` on disk, and SHALL NOT change the size or structure of the published `cucumber.report` or `cucumber.screenshot` attachments.

#### Scenario: Published report attachment size is unaffected
- **WHEN** a Cucumber report with screenshots is published
- **THEN** the `cucumber.report` HTML attachment and `cucumber.screenshot` attachments are unchanged in structure and size compared to before this capability existed

### Requirement: Missing or failed screenshot retrieval degrades gracefully
If a referenced screenshot's bytes cannot be retrieved, the report tab SHALL continue to display the rest of the report rather than failing to load the report entirely.

#### Scenario: One screenshot fails to load
- **WHEN** the report tab fails to retrieve the bytes for one referenced screenshot
- **THEN** the report tab still displays the report and the remaining screenshots, showing the unavailable screenshot as missing rather than blocking the whole report
