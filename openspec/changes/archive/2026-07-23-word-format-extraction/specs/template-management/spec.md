## MODIFIED Requirements

### Requirement: User can upload Word templates
The system SHALL allow users to upload `.docx` files as templates. Uploaded templates MUST be parsed to extract structure information, variables, and formatting. The upload MUST be triggered via a frontend modal with drag-and-drop support. Upon upload, the system SHALL automatically trigger format extraction and style fingerprint generation.

#### Scenario: Successful template upload with format extraction
- **WHEN** user uploads a valid `.docx` file with template configuration
- **THEN** the system SHALL store the file, parse its structure, extract `{{variable}}` placeholders, run format extraction to generate `style_spec.json`
- **AND** return a success response with parsed metadata, variable count, and format fingerprint

#### Scenario: Upload invalid file format
- **WHEN** user uploads a non-`.docx` file (e.g., `.pdf`, `.png`)
- **THEN** the system SHALL reject the upload and return a clear error message indicating supported formats

#### Scenario: Upload file size exceeds limit
- **WHEN** user uploads a template file exceeding 50MB
- **THEN** the system SHALL reject the upload and return an error with the maximum allowed size

### Requirement: Upload result shows template summary with format info
After successful template creation, the system SHALL display a result summary including format extraction results before closing the modal.

#### Scenario: Show template creation result with format info
- **WHEN** template is created successfully with format extraction complete
- **THEN** the modal SHALL show: template name, detected variable count, detected style count, template status
- **AND** provide a "查看模板" button linking to the template detail page

### Requirement: Template version management includes format comparison
The system SHALL track version history for each template, including version number, update timestamp, change description, format fingerprint, and support rollback.

#### Scenario: Compare format fingerprints across versions
- **WHEN** user uploads a new file for an existing template
- **THEN** the system SHALL compare the new format fingerprint with the previous version
- **AND** warn if significant format changes are detected (e.g., page setup, styles changed)
