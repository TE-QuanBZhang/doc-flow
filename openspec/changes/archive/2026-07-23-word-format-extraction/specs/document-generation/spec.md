## MODIFIED Requirements

### Requirement: System supports single document generation with LLM content
The system SHALL allow users to generate a single document by filling in template variables manually or via LLM-assisted content generation. The generation process SHALL: extract template format spec, build LLM prompt from field schema, generate field values via LLM, validate against schema, render with docxtpl, and run quality check.

#### Scenario: Generate document with LLM-assisted fields
- **WHEN** user selects a template with LLM generation enabled, provides business input, and clicks "生成文档"
- **THEN** the system SHALL build prompts from field schema, call LLM to generate field values, validate output, render the document using docxtpl, run quality validation
- **AND** display the result with quality report

#### Scenario: Generate document with manual fields only
- **WHEN** user fills all required variables manually and clicks "生成文档"
- **THEN** the system SHALL use user-provided values directly, render via docxtpl, and skip LLM generation step
- **AND** display the result

#### Scenario: Save document as draft
- **WHEN** user fills partial values and clicks "保存草稿"
- **THEN** the system SHALL save the current variable values as a draft for later continuation

### Requirement: System supports batch generation with LLM mode
The system SHALL allow users to import data from Excel/CSV and generate multiple documents in batch, with optional LLM enrichment for each row.

#### Scenario: Batch generation with LLM enrichment
- **WHEN** user imports Excel data and enables LLM enrichment for specific fields
- **THEN** the system SHALL process each row individually, calling LLM for configured fields, validate output, render document, and track generation quality per item

### Requirement: System provides quality report per generated document
The system SHALL generate and store a quality report for each document generation, including style consistency score, placeholder resolution status, and any detected deviations.

#### Scenario: View quality report with generated document
- **WHEN** user views a generated document
- **THEN** the system SHALL display the quality report alongside the document preview
- **AND** highlight any format deviations or unresolved placeholders
