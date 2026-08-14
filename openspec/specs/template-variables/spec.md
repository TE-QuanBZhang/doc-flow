## Purpose

Define template variable management: extraction, grouping, and schema definition.

## Requirements

### Requirement: System supports multiple variable types
The system SHALL support the following variable types: text, number, date, enum, boolean, object, and list.

#### Scenario: Define a text variable
- **WHEN** template admin configures a variable with type "text" and name "company_name"
- **THEN** the system SHALL accept the variable definition and present a text input field during document generation

#### Scenario: Define a number variable
- **WHEN** template admin configures a variable with type "number" and name "contract_amount"
- **THEN** the system SHALL accept the variable definition and present a numeric input field during document generation

#### Scenario: Define an enum variable
- **WHEN** template admin configures an enum variable "department" with options ["HR", "Engineering", "Sales"]
- **THEN** the system SHALL accept the definition and present a dropdown selector during document generation

#### Scenario: Define a boolean variable
- **WHEN** template admin configures a boolean variable "include_terms" with default value "true"
- **THEN** the system SHALL accept the definition and present a checkbox during document generation

#### Scenario: Define a list variable
- **WHEN** template admin configures a list variable "line_items" containing object type items
- **THEN** the system SHALL accept the definition and present a table-like input for multiple entries during document generation

### Requirement: Variables are automatically extracted from templates
The system SHALL automatically parse uploaded templates to detect `{{variable}}` placeholders and create corresponding variable definitions.

#### Scenario: Auto-detect variables on upload
- **WHEN** user uploads a template containing `{{company_name}}`, `{{sign_date}}`, and `{{department}}` placeholders
- **THEN** the system SHALL automatically create variable entries for each unique placeholder with default type "text"

#### Scenario: Update variable after re-upload
- **WHEN** user uploads a new version of a template with different variables
- **THEN** the system SHALL detect new variables, flag removed variables, and prompt user to confirm changes

### Requirement: Variable default values and descriptions
The system SHALL support configuring default values and help descriptions for variables.

#### Scenario: Set default value
- **WHEN** template admin sets default value "Acme Corp" for variable "company_name"
- **THEN** during document generation, the input field SHALL be pre-filled with "Acme Corp"

#### Scenario: Set variable description
- **WHEN** template admin sets description "请输入公司全称" for variable "company_name"
- **THEN** during document generation, the system SHALL display this description as a tooltip or label hint

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
