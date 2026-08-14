## ADDED Requirements

### Requirement: System builds constrained system prompt for LLM
The system SHALL construct a high-constraint system prompt that instructs the LLM to output only valid field-value JSON, with no Markdown formatting, no extra commentary, and no formatting instructions. The LLM provider SHALL be DeepSeek (deepseek-chat) via OpenAI-compatible API.

#### Scenario: Build system prompt with constraints
- **WHEN** a template has defined field schema with 5 fields
- **THEN** the system SHALL generate a system prompt containing: JSON-only output constraint, field schema, length limits, tone requirements, banned terms list

#### Scenario: System prompt enforces JSON-only output
- **WHEN** LLM receives the system prompt
- **THEN** the LLM SHALL output only a JSON object matching the field schema
- **AND** the output SHALL contain no Markdown code blocks, no explanatory text, no additional formatting

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

### Requirement: System builds user prompt with field schema and business input
The system SHALL construct a user prompt that includes the field JSON schema, business input data, and writing constraints (tone, max length, banned terms).

#### Scenario: Build user prompt with schema
- **WHEN** user provides business input for document generation
- **THEN** the system SHALL embed the field schema, business input, tone setting, max length, and banned terms into the user prompt template

#### Scenario: Support configurable tone and constraints
- **WHEN** template admin configures tone as "formal" and max paragraph length as 200 characters
- **THEN** the system SHALL include these constraints in the user prompt

### Requirement: System validates LLM output against field schema
The system SHALL validate the LLM-generated JSON against the field schema, checking field existence, field types, length limits, and banned terms.

#### Scenario: Validate successful LLM output
- **WHEN** LLM returns valid JSON matching the field schema
- **THEN** the system SHALL accept the output and proceed to document rendering

#### Scenario: Auto-retry on validation failure
- **WHEN** LLM output fails schema validation (missing field, wrong type, or banned term detected)
- **THEN** the system SHALL retry up to 3 times with lowered temperature
- **AND** if all retries fail, return a clear error listing the validation issues

### Requirement: System supports prompt versioning and audit trail
The system SHALL track the prompt template version used for each document generation, enabling audit and regression testing.

#### Scenario: Record prompt version with generation
- **WHEN** a document is generated using an LLM-generated field
- **THEN** the system SHALL record the prompt template version, LLM model, temperature setting, and field schema version in the generation audit log
