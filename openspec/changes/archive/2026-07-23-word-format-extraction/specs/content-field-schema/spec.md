## ADDED Requirements

### Requirement: Field schema supports type constraints
The system SHALL define field schemas with type constraints including: string, number, date, enum, boolean, object, and array. Each type SHALL support additional validation rules.

#### Scenario: Define string field with length constraint
- **WHEN** template admin defines a string field "summary" with max length 200
- **THEN** the system SHALL enforce that LLM-generated content for this field does not exceed 200 characters

#### Scenario: Define number field with range constraint
- **WHEN** template admin defines a number field "amount" with min 0 and max 999999.99
- **THEN** the system SHALL validate LLM output is within range

#### Scenario: Define date field with format constraint
- **WHEN** template admin defines a date field "effective_date" with format "YYYY-MM-DD"
- **THEN** the system SHALL validate the LLM output matches the specified date format

### Requirement: Field schema supports enum values and display labels
The system SHALL support enum fields with predefined options, each option having a stored value and display label.

#### Scenario: Define enum field with options
- **WHEN** template admin defines an enum field "contract_type" with options ["sales", "purchase", "service"]
- **THEN** the system SHALL restrict LLM output to one of the defined enum values

### Requirement: Field schema supports required and optional fields
The system SHALL support marking fields as required or optional. Optional fields with missing data SHALL use empty string or configured default value.

#### Scenario: Required field must have value
- **WHEN** a required field "customer_name" has no value from LLM
- **THEN** the system SHALL reject the output and trigger retry

#### Scenario: Optional field defaults to empty
- **WHEN** an optional field "notes" is not populated by LLM
- **THEN** the system SHALL use empty string as default value

### Requirement: Field schema supports banned terms list
The system SHALL support configuring banned terms per field or globally. LLM output containing banned terms SHALL be rejected.

#### Scenario: Reject output with banned term
- **WHEN** LLM output for field "description" contains a banned term ("最优", "国家级")
- **THEN** the system SHALL reject the output and trigger retry with strengthened banned term warning
