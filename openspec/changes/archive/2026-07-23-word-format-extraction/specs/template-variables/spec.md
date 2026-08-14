## ADDED Requirements

### Requirement: Variable schema supports LLM generation hints
The system SHALL support configuring LLM-specific hints per variable, including: generation prompt, tone preference, max length, banned terms, and reference example text.

#### Scenario: Configure LLM hint for variable
- **WHEN** template admin sets LLM hint "请用正式语气描述合同目的" for variable "contract_purpose"
- **THEN** during LLM content generation, this hint SHALL be included in the prompt for that specific field

#### Scenario: Variable with max length constraint
- **WHEN** template admin sets max length 100 for variable "summary"
- **THEN** the system SHALL enforce this limit during LLM generation and schema validation

### Requirement: Variable schema supports format validation rules
The system SHALL support format validation rules per variable type, including: regex pattern, date format, number range, and enum options.

#### Scenario: Enum variable drives LLM output
- **WHEN** template admin defines an enum variable "department" with ["HR", "Engineering", "Sales"]
- **THEN** the LLM prompt SHALL include these enum options as valid values
- **AND** the validator SHALL reject any value outside the enum list
