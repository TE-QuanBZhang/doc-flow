## MODIFIED Requirements

### Requirement: LLM provider is DeepSeek with configurable API
DeepSeek API SHALL be the default LLM provider, accessed via its OpenAI-compatible endpoint. The API base URL and model SHALL be configurable.

#### Scenario: Configure DeepSeek API
- **WHEN** system starts with DEEPSEEK_API_KEY environment variable set
- **THEN** the system SHALL initialize the LLM client with base URL `https://api.deepseek.com/v1` and model `deepseek-chat`

#### Scenario: Switch to alternative provider
- **WHEN** user sets LLM_API_BASE and LLM_MODEL environment variables
- **THEN** the system SHALL use the configured endpoint and model instead of DeepSeek defaults

#### Scenario: DeepSeek Function Calling for structured output
- **WHEN** LLM is called for field generation
- **THEN** the system SHALL use DeepSeek's Function Calling mode with a JSON Schema function definition to enforce structured output

#### Scenario: LLM settings from settings service
- **WHEN** the settings service has saved LLM configuration (provider, base URL, model, API key)
- **THEN** the system SHALL use the saved configuration for document generation, overriding environment variable defaults
- **AND** when no saved configuration exists, the system SHALL fall back to environment variables
