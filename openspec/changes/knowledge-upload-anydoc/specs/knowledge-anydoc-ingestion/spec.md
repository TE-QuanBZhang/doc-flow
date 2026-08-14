# knowledge-anydoc-ingestion Specification

## Purpose
Define the knowledge base ingestion pipeline: files uploaded from the Knowledge page are converted to Markdown via anydoc and stored as knowledge base content.

## ADDED Requirements

### Requirement: System converts uploaded files to Markdown via anydoc
The system SHALL convert uploaded office documents (Word, PowerPoint, Excel, OpenDocument, RTF, EPUB, CSV, PDF) to GitHub-Flavored Markdown using the local anydoc library, and SHALL store the converted Markdown as knowledge base content.

#### Scenario: Convert office document on upload
- **WHEN** user uploads a Word/PPT/Excel/PDF file to the knowledge base
- **THEN** the system SHALL convert the file content to Markdown locally via anydoc
- **AND** the system SHALL store the resulting Markdown under the knowledge documents directory
- **AND** the system SHALL return per-file conversion status in the upload response

#### Scenario: Markdown files pass through without conversion
- **WHEN** user uploads a `.md` or `.markdown` file
- **THEN** the system SHALL copy the file directly into the knowledge documents directory without conversion

#### Scenario: Conversion failure is reported per file
- **WHEN** an uploaded file cannot be converted (unsupported, encrypted, or malformed)
- **THEN** the system SHALL report the conversion error for that file
- **AND** the system SHALL continue processing the remaining files in the same request

### Requirement: System ingests converted Markdown into the searchable knowledge base
The system SHALL place converted Markdown documents under a knowledge directory that is included in RAG search paths, so the content is immediately searchable.

#### Scenario: Converted content is searchable
- **WHEN** a file has been converted and stored in the knowledge directory
- **THEN** the system SHALL make its Markdown content retrievable by RAG search without further manual steps

#### Scenario: Knowledge directory is the default search path
- **WHEN** the system starts with no explicit search paths configured
- **THEN** the system SHALL include the knowledge documents directory in the default RAG search paths
