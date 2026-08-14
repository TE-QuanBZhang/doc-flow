## Purpose

Define conditional blocks and loop blocks supported inside Word templates.

## Requirements

### Requirement: System supports conditional blocks
The system SHALL support `{{#if:variable}}...{{/if}}` syntax to conditionally include or exclude content sections based on variable values.

#### Scenario: Simple condition renders content
- **WHEN** template contains `{{#if:include_terms}}` followed by terms paragraph and `{{/if}}`, and the user sets `include_terms = true`
- **THEN** the generated document SHALL include the terms paragraph

#### Scenario: Condition hides content
- **WHEN** template contains `{{#if:include_terms}}` ... `{{/if}}`, and the user sets `include_terms = false`
- **THEN** the generated document SHALL exclude the terms paragraph

#### Scenario: If-else condition
- **WHEN** template uses `{{#if:region=="CN"}}` Chinese content `{{else}}` English content `{{/if}}`, and user sets `region = "CN"`
- **THEN** the generated document SHALL contain the Chinese content
- **AND** SHALL NOT contain the English content

### Requirement: System supports loop blocks
The system SHALL support `{{#each:list_variable}}...{{/each}}` syntax to repeat content sections for each item in a list.

#### Scenario: Loop generates table rows
- **WHEN** template defines a loop block `{{#each:line_items}}` wrapping a table row with `{{name}}` and `{{amount}}`, and user provides 3 line items
- **THEN** the generated document table SHALL contain 3 data rows

#### Scenario: Loop generates paragraph list
- **WHEN** template defines `{{#each:participants}}` wrapping `{{name}} - {{role}}` in a paragraph
- **THEN** the generated document SHALL contain one line per participant

### Requirement: System supports nested logic blocks
The system SHALL support nesting: condition blocks inside loop blocks, and loop blocks inside condition blocks.

#### Scenario: Condition inside loop
- **WHEN** template has `{{#each:items}}` containing `{{#if:items.discount > 0}}` discount line `{{/if}}`, and the first item has discount while the second does not
- **THEN** the first item row SHALL include the discount line
- **AND** the second item row SHALL NOT include the discount line

#### Scenario: Loop inside condition
- **WHEN** template has `{{#if:show_details}}` containing `{{#each:details}}`, and `show_details = true`
- **THEN** the generated document SHALL include all detail items

### Requirement: System detects and reports template syntax errors
The system SHALL validate template block syntax and report mismatched or unclosed blocks.

#### Scenario: Detect unclosed if block
- **WHEN** template contains `{{#if:condition}}` without a matching `{{/if}}`
- **THEN** the system SHALL report a template parsing error with location details

#### Scenario: Detect mismatched block tags
- **WHEN** template contains `{{#each:items}}...{{/if}}` (opening each but closing if)
- **THEN** the system SHALL report a syntax mismatch error with location and expected tag
