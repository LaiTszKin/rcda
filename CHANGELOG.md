# Changelog

All notable changes to this project are documented in this file.

## [0.3.0] - 2026-02-26

### Added

- Add multi-language support for Traditional Chinese, Simplified Chinese, and English.
- Add language preference setting with system-locale auto detection and manual override.
- Add localized default system prompts and localized tray menu labels.
- Add i18n unit tests for language resolution and localized resources.

### Changed

- Redesign desktop UI and styles for clearer interaction flow.
- Improve IME-aware input handling and keyboard behavior in the dialog.

## [0.2.0] - 2026-02-26

### Added

- Optimize prompt assembly and improve no-change flow.
- Add Dockerfile, docker-compose, and Makefile for desktop runtime operations.
- Add integration, property, and shortcut unit tests for API/shortcut behavior.

### Fixed

- Allow ESC to cancel and continue output generation.
- Improve response flow and macOS window behavior.
- Stabilize desktop startup configuration loading.
- Improve cross-platform release workflow and released-tag binary publishing.

### Changed

- Remove legacy `update_env.sh` path and simplify update command.
- Switch release operation from DMG-focused flow to Docker-oriented ops.
- Update dependencies and reformat files for precheck consistency.

### Documentation

- Add concise project introduction.
- Add macOS self-signing guide.

## [0.1.0] - 2026-02-26

### Added

- Initial release.
