# system-settings Specification

## Purpose
TBD - created by archiving change sirchmunk-web-port. Update Purpose after archive.
## Requirements
### Requirement: System provides settings management for LLM
The system SHALL provide a settings page to configure LLM provider, API base URL, API key, and model. Settings SHALL be persisted server-side and shared with document generation.

#### Scenario: View current settings
- **WHEN** user opens the settings page
- **THEN** the system SHALL display the current LLM configuration (base URL, model, provider) with the API key masked

#### Scenario: Update LLM settings
- **WHEN** user saves new LLM settings
- **THEN** the system SHALL persist the settings and apply them to subsequent chat and generation calls

#### Scenario: Test LLM connectivity
- **WHEN** user clicks "测试连接"
- **THEN** the system SHALL make a test LLM call and report success or the error detail

#### Scenario: View environment info
- **WHEN** user opens the settings page
- **THEN** the system SHALL display environment information (version, runtime, storage path)

### Requirement: System provides UI settings
The system SHALL allow configuring UI language and theme from the settings page, persisted per-user.

#### Scenario: Change UI language
- **WHEN** user selects a language in settings
- **THEN** the system SHALL persist the choice and apply it to the interface

