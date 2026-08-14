## ADDED Requirements

### Requirement: Document generation is accessible as secondary module
The system SHALL keep document generation, template management, and batch tasks as functional modules, accessible from the main navigation, while the AI chat page SHALL be the default landing page.

#### Scenario: Navigate from main chat page to document generation
- **WHEN** user clicks the document generation entry in the sidebar
- **THEN** the system SHALL navigate to the document generation page without losing the chat session state

#### Scenario: Default landing page is AI chat
- **WHEN** user opens the application root path
- **THEN** the system SHALL render the AI chat/search page as the default page
- **AND** the previous dashboard page SHALL remain accessible at its dedicated route
