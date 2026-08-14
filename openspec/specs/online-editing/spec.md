## Purpose

Define requirements for online editing of template documents.

## Requirements

### Requirement: System provides variable editing panel
The system SHALL display a variable editing panel alongside the document preview, allowing users to modify field values with real-time preview updates.

#### Scenario: Display variable panel with all fields
- **WHEN** user opens a document for editing
- **THEN** the system SHALL show a panel listing all document variables grouped by category, with current values displayed

#### Scenario: Edit field and refresh preview
- **WHEN** user changes a variable value in the editing panel
- **THEN** the system SHALL update the document preview in real-time to reflect the new value

#### Scenario: Highlight missing required fields
- **WHEN** a required variable has no value
- **THEN** the system SHALL highlight the field in the panel and indicate it as required

#### Scenario: Show field validation errors inline
- **WHEN** user enters an invalid value (e.g., text in a number field)
- **THEN** the system SHALL display an inline error message next to the field

### Requirement: System supports lightweight text editing
The system SHALL allow users to modify document text directly in the preview area for minor adjustments.

#### Scenario: Edit paragraph text
- **WHEN** user clicks on a paragraph in the preview
- **THEN** the system SHALL enable inline text editing for that paragraph

#### Scenario: Replace selected text
- **WHEN** user selects and replaces text in the preview
- **THEN** the system SHALL update the document content and track the change

#### Scenario: Undo/redo edits
- **WHEN** user performs multiple edits
- **THEN** the system SHALL support undo and redo operations for text changes

### Requirement: System provides AI-assisted writing
The system SHALL allow users to trigger AI rewriting for selected text content.

#### Scenario: AI rewrite selected text
- **WHEN** user selects text and clicks "AI 改写"
- **THEN** the system SHALL display options (formalize, simplify, expand)
- **AND** after user selects an option, the system SHALL replace the text with AI-generated content

#### Scenario: Mark AI-generated content
- **WHEN** AI generates or rewrites content
- **THEN** the system SHALL visually mark the AI-generated content and require user confirmation before finalizing
