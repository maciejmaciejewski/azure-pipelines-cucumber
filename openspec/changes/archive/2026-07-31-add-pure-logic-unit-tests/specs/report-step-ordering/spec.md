## Purpose

Defines how a scenario's `before`/`after` hooks are combined with its regular steps when raw Cucumber JSON reports are unified into a single report, so hooks are visible in the published report and appear in the order they actually ran.

## ADDED Requirements

### Requirement: Before hooks precede scenario steps
When a scenario's raw Cucumber JSON contains `before` hook entries, the unified report SHALL place them ahead of the scenario's regular steps, in their original relative order, each labeled with keyword `Before` and marked visible.

#### Scenario: Scenario with a before hook and steps
- **WHEN** a scenario's JSON has one or more `before` entries followed by one or more `steps`
- **THEN** the unified report's step list for that scenario begins with the `before` entries, in their original order, followed by the original `steps`

### Requirement: After hooks follow scenario steps
When a scenario's raw Cucumber JSON contains `after` hook entries, the unified report SHALL place them behind the scenario's regular steps, in their original relative order, each labeled with keyword `After` and marked visible.

#### Scenario: Scenario with steps and an after hook
- **WHEN** a scenario's JSON has one or more `steps` followed by one or more `after` entries
- **THEN** the unified report's step list for that scenario ends with the `after` entries, in their original order, appearing after the original `steps`

### Requirement: Scenarios without hooks are unaffected
Scenarios with no `before` or `after` entries SHALL have their `steps` list unchanged by the unification process.

#### Scenario: Scenario with no hooks
- **WHEN** a scenario's JSON has no `before` or `after` entries
- **THEN** the unified report's `steps` list for that scenario is identical to the original `steps` list
