# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v0.1.1] - 2026-03-24

### Added

- Added full i18n support with language context and locale dictionaries (`zh`/`en`)
- Added English workspace docs for core agents (PO, SM, Designer, Developers, Tester)
- Added PO/SM heartbeat guide documents for巡检 and idle-frequency management

### Changed

- Localized major dashboard components (setup, boards, chats, status, conversation views)
- Updated OpenClaw setup API to support language-aware workspace preparation (`zh`/`en`)
- Updated agent workspace docs to use explicit absolute state/workspace paths

### Fixed

- Fixed post re-register setup flow so the Gateway restart prompt can appear reliably

## [v0.1.0] - 2026-03-22

### Added

- Initial release of AgileClawTeam - Agile Multi-Agent System
- Multi-role support: Product Owner (PO), Scrum Master (SM), Designer, Developer, Tester
- Interactive dashboard with task boards, agent panels, and conversation viewers
- OpenClaw integration for agent management and configuration
- Sprint lifecycle management with phases and item tracking
- Backlog management and task assignment
- Real-time messaging and chat panels
- Artifact management and open/close functionality
- Gateway debugging and patrol features
- Comprehensive README in both English and Chinese
