# file-browser-service Specification

## Purpose
TBD - created by archiving change sirchmunk-web-port. Update Purpose after archive.
## Requirements
### Requirement: System provides file upload service with deduplication
The system SHALL provide file upload endpoints that store files under the knowledge directory, detect duplicates by content hash, and track usage statistics.

#### Scenario: Upload file with duplicate detection
- **WHEN** user uploads a file that already exists in the target collection
- **THEN** the system SHALL reject the upload and return the duplicate file info

#### Scenario: Upload new file
- **WHEN** user uploads a file not present in the knowledge base
- **THEN** the system SHALL store the file, register it in the collection, and return the file metadata

#### Scenario: Query storage usage
- **WHEN** user requests usage stats
- **THEN** the system SHALL return total file count, total size, and per-collection breakdown

### Requirement: System provides file browser and file picker
The system SHALL provide endpoints to browse server directories and pick files/directories for indexing, including defaults discovery.

#### Scenario: Browse directory contents
- **WHEN** user requests a directory listing
- **THEN** the system SHALL return files and subdirectories with metadata (type, size, extension)

#### Scenario: Discover default paths
- **WHEN** user opens the file picker
- **THEN** the system SHALL return default candidate paths (home, documents, current knowledge base)

#### Scenario: Pick path for indexing
- **WHEN** user selects a file or directory path
- **THEN** the system SHALL validate the path exists and is readable, and start indexing its contents

