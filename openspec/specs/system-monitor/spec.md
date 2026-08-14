# system-monitor Specification

## Purpose
TBD - created by archiving change sirchmunk-web-port. Update Purpose after archive.
## Requirements
### Requirement: System provides monitoring dashboard
The system SHALL provide a monitor page showing the health status of core services (API, database, LLM, embedding), system resource usage, and knowledge/chat activity statistics.

#### Scenario: View service health overview
- **WHEN** user opens the monitor page
- **THEN** the system SHALL display each core service's status (healthy/unhealthy) with latency where applicable

#### Scenario: View system resource usage
- **WHEN** user opens the monitor page
- **THEN** the system SHALL display CPU, memory, and disk usage of the host

#### Scenario: View chat and knowledge activity
- **WHEN** user opens the monitor page
- **THEN** the system SHALL display chat message counts and knowledge operation statistics over time

#### Scenario: View storage usage
- **WHEN** user opens the monitor page
- **THEN** the system SHALL display knowledge base storage usage (file count, total size, per-collection breakdown)

#### Scenario: Refresh monitoring data
- **WHEN** user clicks "刷新" on the monitor page
- **THEN** the system SHALL re-collect all monitoring metrics and update the dashboard

