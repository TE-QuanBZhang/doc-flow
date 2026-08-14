# ai-knowledge-chat Specification

## Purpose
TBD - created by archiving change sirchmunk-web-port. Update Purpose after archive.
## Requirements
### Requirement: System provides AI chat with knowledge base retrieval
The system SHALL provide a chat interface as the main entry page where users can ask questions, with optional RAG retrieval against a selected knowledge base and optional web search. Chat SHALL stream responses over a WebSocket connection.

#### Scenario: User asks a question with RAG enabled
- **WHEN** user selects a knowledge base, enables RAG, sends a question
- **THEN** the system SHALL retrieve relevant content from the knowledge base, generate a response with citations, and stream the response incrementally over WebSocket

#### Scenario: User asks a question without knowledge base
- **WHEN** user sends a question with RAG disabled
- **THEN** the system SHALL respond using the LLM directly without retrieval context

#### Scenario: Stop streaming response
- **WHEN** user clicks "停止生成" during streaming
- **THEN** the system SHALL terminate the generation and keep the partial response

#### Scenario: Select knowledge base before chatting
- **WHEN** user opens the chat page
- **THEN** the system SHALL load the knowledge base list and preselect the default knowledge base

### Requirement: System provides search suggestions during chat input
The system SHALL show file-level search suggestions while the user types in the chat input, based on knowledge base content.

#### Scenario: Show suggestions while typing
- **WHEN** user types in the chat input with a knowledge base selected
- **THEN** the system SHALL fetch and display matching file suggestions with highlight ranges
- **AND** user can select a suggestion to attach the file context to the question

### Requirement: System provides chat session management
The system SHALL support creating new chat sessions, loading historical sessions, and switching between sessions from the chat interface.

#### Scenario: Create a new session
- **WHEN** user clicks "新会话"
- **THEN** the system SHALL reset the chat state and start a new session

#### Scenario: Load a historical session
- **WHEN** user selects a session from the session list
- **THEN** the system SHALL load the session messages and restore the chat view

