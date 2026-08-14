## ADDED Requirements

### Requirement: Text replacement preserves run formatting
The system SHALL replace `{{placeholder}}` text within document runs while preserving the run's `<w:rPr>` formatting properties (font, size, color, bold, italic, underline) and paragraph's `<w:pPr>` properties.

#### Scenario: Replace text in a formatted run
- **WHEN** a run contains `{{customer_name}}` with bold, red, 14pt formatting
- **THEN** the replacement text SHALL use the same bold/red/14pt formatting
- **AND** the paragraph alignment and spacing SHALL remain unchanged

#### Scenario: Placeholder spans multiple runs
- **WHEN** a placeholder is split across adjacent runs (e.g., `{{customer` in run 1, `_name}}` in run 2)
- **THEN** the system SHALL merge the runs' text, replace the placeholder, and write the result back preserving the first run's formatting

### Requirement: Image replacement preserves geometry properties
The system SHALL replace image binary content while preserving the image's `<wp:extent>` (width/height), `<wp:anchor>` (position, rotation, text-wrapping) properties.

#### Scenario: Replace image content
- **WHEN** a template contains a logo image with specific dimensions, position, and rotation
- **THEN** replacing the image SHALL update only the binary content referenced by `r:embed`
- **AND** the image SHALL retain its original width, height, position, and rotation

#### Scenario: Image format conversion
- **WHEN** the new image format differs from the original (e.g., JPG replacing PNG)
- **THEN** the system SHALL convert the image to match the original part's content type
- **AND** preserve all geometric properties

### Requirement: Embedded object replacement preserves container
The system SHALL replace embedded object data (e.g., OLE Excel chart data) while preserving the `<o:OLEObject>` container, ProgID, and shape properties.

#### Scenario: Replace embedded object data
- **WHEN** a template contains an embedded Excel chart (`embeddings/*.xlsx`)
- **THEN** the system SHALL replace the chart data file content
- **AND** preserve the OLE container, ProgID, and display properties

### Requirement: Table replacement preserves table style
The system SHALL replace table cell text content while preserving the table's `<w:tblPr>` (table style, borders, shading) and `<w:tblGrid>` (column widths) properties.

#### Scenario: Replace table content
- **WHEN** a template table has a specific style, column widths, and header formatting
- **THEN** replacing cell text SHALL preserve the table style and column layout
- **AND** header row formatting (bold, shading) SHALL remain unchanged

#### Scenario: Fixed row count replacement
- **WHEN** the replacement data has the same number of rows as the template table
- **THEN** the system SHALL update cell text in place without adding or removing rows

### Requirement: Replacement validates document integrity
After any replacement operation, the system SHALL validate that the resulting document can be opened by python-docx and that no XML structure was corrupted.

#### Scenario: Validate after replacement
- **WHEN** a replacement operation completes
- **THEN** the system SHALL re-open the document with python-docx to verify integrity
- **AND** raise an error if the document is corrupted
