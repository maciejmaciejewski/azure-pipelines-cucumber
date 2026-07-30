## Purpose

Defines which Node.js execution handlers and minimum agent version the `PublishCucumberReport` task must declare, so the task can run in Azure DevOps organizations that restrict outdated Node execution handlers and stays aligned with currently supported Node.js LTS releases.

## ADDED Requirements

### Requirement: Task declares only current Node execution handlers
The `PublishCucumberReport` task's `execution` block in `task.json` SHALL declare only execution handlers for Node.js versions that are currently supported (non-EOL) at time of release, and SHALL NOT declare the legacy `Node` (Node 6) handler or any Node 10/12/14/16 handler.

#### Scenario: Pipeline validation in an org with Node 6 tasks disabled
- **WHEN** a pipeline that uses `PublishCucumberReport` is validated in an Azure DevOps organization with the "Disable Node 6 tasks" setting enabled
- **THEN** validation succeeds because the task declares no execution handler that relies on Node.js 6

#### Scenario: Task package contains no deprecated handlers
- **WHEN** `tasks/PublishCucumberReport/task.json` is inspected
- **THEN** its `execution` object contains only `Node20_1` and `Node24` handler entries, targeting `index.js`

### Requirement: Minimum agent version matches declared handlers
The task's `minimumAgentVersion` SHALL be set to the lowest Azure Pipelines agent version that supports every execution handler declared in the task's `execution` block, so agents that cannot run any declared handler are rejected with a clear "upgrade your agent" error instead of silently failing at runtime.

#### Scenario: Agent too old for any declared handler
- **WHEN** a pipeline runs `PublishCucumberReport` on a self-hosted agent older than the task's `minimumAgentVersion`
- **THEN** the pipeline fails with an explicit agent-version error rather than attempting to execute the task under an unsupported or unlisted handler

#### Scenario: Agent supports the newest declared handler
- **WHEN** a pipeline runs `PublishCucumberReport` on an agent at or above `minimumAgentVersion`
- **THEN** the agent selects the highest-supported handler among `Node20_1`/`Node24` and the task runs successfully
