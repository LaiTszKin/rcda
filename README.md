# Text Polish Agent

Text Polish Agent is a hotkey-first desktop app for polishing and translating text with AI.
It pops up instantly from anywhere on your system, helps you refine tone/clarity through interactive options, then generates an English translation you can copy in one click.

## Features

- Global shortcut to open a floating assistant window.
- Interactive AI-based text polishing workflow.
- One-click English translation after confirmation.
- Multi-language UI support (Traditional Chinese, Simplified Chinese, English).
- Auto language detection from system locale with manual override in settings.
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

## Docker + Makefile

```bash
make run
make stop
make restart
make update
make build
```

- `make run`: start Docker services, then launch Electron desktop app on host.
- `make stop`: stop Docker services.

## Quality Checks

```bash
npm run format:check
npm test
npm run build
```

## CI

- CI checks run by change scope through GitHub Actions.

## macOS Self-Signing (Local Testing)

If the downloaded app cannot be opened on macOS because it is unsigned/not notarized, you can self-sign it for local use:

```bash
codesign --force --deep --sign - "/Applications/Text Polish Agent.app"
xattr -dr com.apple.quarantine "/Applications/Text Polish Agent.app"
codesign --verify --deep --strict --verbose=2 "/Applications/Text Polish Agent.app"
```

Notes:

- `--sign -` performs ad-hoc signing (local trust only).
- This is suitable for personal testing but not for public distribution.
- For public release, use Apple Developer ID signing and notarization.

## License

MIT License. See the [LICENSE](./LICENSE) file.
