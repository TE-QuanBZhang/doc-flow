## ADDED Requirements

### Requirement: System provides knowledge base management
The system SHALL provide a knowledge base page listing all knowledge bases with file counts, and SHALL support uploading files into a knowledge base.

#### Scenario: List knowledge bases
- **WHEN** user opens the knowledge page
- **THEN** the system SHALL display the knowledge base list with file counts and refresh status

#### Scenario: Upload file to knowledge base
- **WHEN** user selects a file and uploads it to a knowledge base
- **THEN** the system SHALL check for duplicates, store the file, and make it searchable
- **AND** duplicate files SHALL be rejected with a message

### Requirement: System provides knowledge base collections
The system SHALL organize uploaded files into collections and SHALL allow browsing, downloading, and deleting files within a collection.

#### Scenario: Browse collection contents
- **WHEN** user clicks a collection
- **THEN** the system SHALL list the files in the collection with metadata (size, type, upload time)

#### Scenario: Delete file from collection
- **WHEN** user deletes a file from a collection
- **THEN** the system SHALL remove the file and its index data

#### Scenario: Delete collection
- **WHEN** user deletes a collection
- **THEN** the system SHALL delete the collection and all contained files

### Requirement: System provides knowledge clustering
The system SHALL group knowledge base files into clusters and SHALL expose cluster details for review.

#### Scenario: View clusters
- **WHEN** user opens the knowledge clusters view
- **THEN** the system SHALL display clusters with their member files and cluster descriptions

#### Scenario: Delete a cluster
- **WHEN** user deletes a cluster
- **THEN** the system SHALL remove the cluster grouping while keeping the underlying files

#### Scenario: Refresh knowledge index
- **WHEN** user clicks "刷新知识库"
- **THEN** the system SHALL re-scan all knowledge bases, update the index, and report refresh status

### Requirement: System provides knowledge statistics
The system SHALL expose knowledge base statistics including file counts, total size, cluster count, and index freshness.

#### Scenario: View knowledge statistics
- **WHEN** user opens the knowledge page
- **THEN** the system SHALL display aggregate statistics across all knowledge bases
