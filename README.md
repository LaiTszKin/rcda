# Text Polish Agent

Text Polish Agent is a desktop application built with Electron + React for quick writing assistance.

## Features

- Global shortcut to open a floating assistant window.
- Interactive AI-based text polishing workflow.
- One-click English translation after confirmation.
- API settings (OpenAI-compatible endpoint and key).
- Custom system prompt and shortcut configuration.
- Tray app behavior with quick open/settings/quit actions.

## Tech Stack

- Electron
- React
- TypeScript
- Vite
- Zustand
- Vitest

## Development

```bash
npm install
npm run dev
```

## Quality Checks

```bash
npm run format:check
npm test
npm run build
```

## Release

- CI checks run by change scope through GitHub Actions.
- Packaging and GitHub Release are triggered manually from the `Build and Release` workflow.

## License

MIT License. See the [LICENSE](./LICENSE) file.
