# Project Overview

## Product Goal

Text Polish Agent helps users improve writing quality quickly from anywhere on desktop by using a global hotkey and a focused AI workflow.

## Main User Flow

1. Press global shortcut to open the floating window.
2. Enter text and submit to AI.
3. Choose a polishing direction or provide custom guidance.
4. Confirm the polished version.
5. Generate English translation and copy results.

## Core Modules

- `src/main`: Electron main process (window, tray, shortcut, IPC).
- `src/renderer`: React UI, state management, API flow.
- `src/shared`: shared types and defaults.

## CI/CD

- `CI Tests by Change Scope`: detect changes, run formatting prechecks, and execute separate test jobs (unit, integration, property-based, e2e).
- `Build and Release`: manual workflow for packaging and optional GitHub Release publishing.
