## ADDED Requirements

### Requirement: System extracts page setup from templates
The system SHALL extract page-level formatting from `.docx` templates, including paper size, orientation, margins, header/footer distance, and section columns.

#### Scenario: Extract page setup from template
- **WHEN** system processes a template with custom page setup (A4, portrait, margins 2.54cm)
- **THEN** the system SHALL output a `style_spec.json` containing paper size, orientation, margin values, header/footer distance, and column settings

#### Scenario: Extract section-specific page setup
- **WHEN** template has multiple sections with different page orientations (e.g., portrait first page, landscape second page)
- **THEN** the system SHALL extract and preserve per-section page settings

### Requirement: System extracts style definitions from templates
The system SHALL extract all paragraph and character style definitions from the template, including font (Chinese/English), size, bold, italic, color, alignment, indentation, line spacing, and spacing before/after.

#### Scenario: Extract paragraph styles
- **WHEN** template has defined paragraph styles (Normal, Heading1, Heading2)
- **THEN** the system SHALL extract each style's font, size, bold, alignment, indentation, line spacing, and spacing settings

#### Scenario: Extract list and multi-level numbering
- **WHEN** template contains multi-level numbering definitions (e.g., "第1章", "1.1", "1.1.1")
- **THEN** the system SHALL extract numbering format, level hierarchy, and indentation for each level

### Requirement: System extracts table formatting from templates
The system SHALL extract table-level formatting including table style, borders, shading, cell margins, vertical alignment, and column width strategy.

#### Scenario: Extract table style from template
- **WHEN** template contains a table with "Table Grid" style, header bold, and light blue header shading
- **THEN** the system SHALL extract table style name, border settings, cell padding, header formatting, and shading colors

#### Scenario: Extract merged cell structure
- **WHEN** template table contains merged cells horizontally or vertically
- **THEN** the system SHALL preserve the merge structure in the extracted format specification

### Requirement: System extracts header, footer, and page number settings
The system SHALL extract header/footer content and configuration, including different first page, odd/even page differentiation, and page number field format.

#### Scenario: Extract header/footer configuration
- **WHEN** template has different headers for first page and odd/even pages
- **THEN** the system SHALL extract and differentiate header/footer content for each section type

#### Scenario: Extract page number format
- **WHEN** template contains page number fields with specific format (e.g., "第X页 共Y页")
- **THEN** the system SHALL extract the page number field configuration and format

### Requirement: System generates template fingerprint for change detection
The system SHALL generate a fingerprint (hash) of the template's format specification to detect format changes across template versions.

#### Scenario: Generate template fingerprint
- **WHEN** system completes format extraction
- **THEN** the system SHALL compute a hash of the `style_spec.json` as the template fingerprint

#### Scenario: Compare fingerprints across versions
- **WHEN** user uploads a new version of a template
- **THEN** the system SHALL compare fingerprints and report any format changes
