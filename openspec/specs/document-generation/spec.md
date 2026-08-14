## Purpose

Define the document generation pipeline: template rendering, LLM-assisted content, batch generation, and task management.
## Requirements
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

#### Scenario: Regenerate document with different values
- **WHEN** user modifies variables on an already-generated document and clicks "重新生成"
- **THEN** the system SHALL regenerate the document with the new values

### Requirement: System supports batch generation from imported data
The system SHALL allow users to import data from Excel/CSV and generate multiple documents in batch, with optional LLM enrichment for each row.

#### Scenario: Import Excel file for batch generation
- **WHEN** user selects a template and uploads an Excel file containing variable data
- **THEN** the system SHALL read the file, parse rows as individual document data sets
- **AND** display a preview of the parsed data with row count

#### Scenario: Map Excel columns to template variables
- **WHEN** the imported Excel columns don't exactly match variable names
- **THEN** the system SHALL present a mapping interface allowing user to match columns to variables

#### Scenario: Validate imported data before batch creation
- **WHEN** user clicks "开始批量生成"
- **THEN** the system SHALL validate all rows against template rules
- **AND** report any rows with validation errors before starting generation

#### Scenario: Batch generation with LLM enrichment
- **WHEN** user imports Excel data and enables LLM enrichment for specific fields
- **THEN** the system SHALL process each row individually, calling LLM for configured fields, validate output, render document, and track generation quality per item

### Requirement: System provides asynchronous batch task management
The system SHALL process batch generation tasks asynchronously with status tracking.

#### Scenario: Create batch generation task
- **WHEN** user initiates batch generation with valid data
- **THEN** the system SHALL create an asynchronous task, return a task ID, and show task status as "processing"

#### Scenario: View batch task progress
- **WHEN** user opens the batch task detail page
- **THEN** the system SHALL display: total count, completed count, failed count, estimated remaining time

#### Scenario: Retry failed items in batch
- **WHEN** a batch task completes with some failed items
- **THEN** the system SHALL allow user to view failure reasons and retry only the failed items

#### Scenario: Cancel running batch task
- **WHEN** user clicks "取消任务" on a running batch task
- **THEN** the system SHALL stop processing remaining items and mark the task as "cancelled"

### Requirement: System supports batch result management
The system SHALL provide tools to manage and retrieve batch generation results.

#### Scenario: Download individual result
- **WHEN** a batch task completes
- **THEN** user can download each successfully generated document individually from the result list

#### Scenario: Download all results as package
- **WHEN** user clicks "下载全部结果" on a completed batch task
- **THEN** the system SHALL package all successfully generated documents into a `.zip` file

#### Scenario: View batch task history
- **WHEN** user navigates to batch task history
- **THEN** the system SHALL list all past batch tasks with status, time, and document count

### Requirement: System provides quality report per generated document
The system SHALL generate and store a quality report for each document generation, including style consistency score, placeholder resolution status, and any detected deviations.

#### Scenario: View quality report with generated document
- **WHEN** user views a generated document
- **THEN** the system SHALL display the quality report alongside the document preview
- **AND** highlight any format deviations or unresolved placeholders

### Requirement: Document generation is accessible as secondary module
The system SHALL keep document generation, template management, and batch tasks as functional modules, accessible from the main navigation, while the AI chat page SHALL be the default landing page.

#### Scenario: Navigate from main chat page to document generation
- **WHEN** user clicks the document generation entry in the sidebar
- **THEN** the system SHALL navigate to the document generation page without losing the chat session state

#### Scenario: Default landing page is AI chat
- **WHEN** user opens the application root path
- **THEN** the system SHALL render the AI chat/search page as the default page
- **AND** the previous dashboard page SHALL remain accessible at its dedicated route

