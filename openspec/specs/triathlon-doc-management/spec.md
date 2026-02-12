# triathlon-doc-management Specification

## Purpose
Provide a user-friendly way for admins to discover and select existing Triathlon scoring documents (instead of memorizing event ids).

## Requirements

### Requirement: Discover available triathlon scoring documents
The system SHALL provide a way for an admin to discover which Triathlon scoring documents exist in the current storage backend.

#### Scenario: localStorage discovery
- **GIVEN** the admin is using localStorage mode
- **WHEN** the admin opens the admin scoring Setup screen
- **THEN** the UI SHALL list available draft/published Triathlon docs derived from localStorage
- **AND** each listed item SHALL include at least: Triathlon Name (eventId), Year, and last-updated timestamp

#### Scenario: AWS backend discovery
- **GIVEN** the admin is using AWS backend mode
- **AND** the admin is authenticated
- **WHEN** the admin opens the admin scoring Setup screen
- **THEN** the UI SHALL list available draft/published Triathlon docs returned by the scoring API
- **AND** each listed item SHALL include at least: Triathlon Name (eventId), Year, kind (draft/published), and last-updated timestamp

### Requirement: Filter available documents by year
The system SHALL support filtering available Triathlon docs by Year.

#### Scenario: Filter by year
- **GIVEN** the admin has selected a Year filter
- **WHEN** the available Triathlon list is displayed
- **THEN** only Triathlon docs matching that Year SHALL be shown

### Requirement: Select an existing document
The admin scoring UI SHALL allow selecting an existing Triathlon doc from the list to load/edit.

#### Scenario: Select from picker
- **WHEN** the admin selects a Triathlon doc from the picker
- **THEN** the UI SHALL populate Triathlon Name and Year accordingly
- **AND** the admin SHALL be able to load/edit the selected doc

### Requirement: Manual entry remains supported
The admin scoring UI SHALL continue to allow manual entry of Triathlon Name and Year.

#### Scenario: Manual entry
- **WHEN** the admin types a Triathlon Name directly
- **THEN** the UI SHALL continue to support loading/saving/publishing that doc
