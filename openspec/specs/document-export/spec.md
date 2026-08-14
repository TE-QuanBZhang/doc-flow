## Purpose

Define requirements for exporting generated documents to Word and PDF formats.

## Requirements

### Requirement: System exports document to Word (.docx) format
The system SHALL generate and export documents in `.docx` format that preserves the original template styling.

#### Scenario: Export single document as docx
- **WHEN** user clicks "导出 Word" on a generated document
- **THEN** the system SHALL return the document as a `.docx` file download

#### Scenario: Preserve template styling in export
- **WHEN** user exports a document generated from a styled template
- **THEN** the exported `.docx` SHALL preserve fonts, colors, table formatting, headers/footers, and page layout from the template

#### Scenario: Resolve all variables before export
- **WHEN** user exports a document with unresolved variables
- **THEN** the system SHALL warn about unresolved placeholders before export

### Requirement: System exports document to PDF format
The system SHALL convert and export documents in PDF format.

#### Scenario: Export single document as PDF
- **WHEN** user clicks "导出 PDF" on a generated document
- **THEN** the system SHALL convert the `.docx` to PDF and return it as a file download

#### Scenario: Handle PDF conversion errors
- **WHEN** PDF conversion fails due to template complexity
- **THEN** the system SHALL return a clear error message suggesting the user download the Word version instead

### Requirement: System supports batch export
The system SHALL allow exporting multiple generated documents as a compressed package.

#### Scenario: Batch export as zip
- **WHEN** user selects multiple generated documents and clicks "批量导出"
- **THEN** the system SHALL package all selected documents into a `.zip` file and initiate download

#### Scenario: Batch export includes naming convention
- **WHEN** user enables batch export with a naming pattern (e.g., "合同_{company_name}_{date}")
- **THEN** the system SHALL name each file in the package according to the pattern using actual field values
