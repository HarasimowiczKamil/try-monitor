# Try Monitor

[![CI](https://github.com/HarasimowiczKamil/try-monitor/actions/workflows/ci.yml/badge.svg)](https://github.com/HarasimowiczKamil/try-monitor/actions/workflows/ci.yml)
[![Release](https://github.com/HarasimowiczKamil/try-monitor/actions/workflows/release.yml/badge.svg)](https://github.com/HarasimowiczKamil/try-monitor/actions/workflows/release.yml)
[![GitHub release](https://img.shields.io/github/v/release/HarasimowiczKamil/try-monitor)](https://github.com/HarasimowiczKamil/try-monitor/releases)

Electron + TypeScript + React desktop app for HTTP/Ping host monitoring in system tray.

## Features

- **HTTP monitoring** — GET/POST requests with configurable URL and method, displays status code and body size
- **Ping monitoring** — ICMP ping via system ping.exe, displays response time in ms
- **System tray** — colored circle icon (green = all OK, yellow = partial, red = all down, orange = checking)
- **Desktop notifications** — optional system notifications on host failure
- **Log history** — per-host log entries with timestamp and result info, configurable retention
- **Customizable** — check interval, language (PL/EN), theme (light/dark/system)
- **Security** — sandboxed renderer, context isolation, CSP, no Node.js in renderer

## Download

[![GitHub release](https://img.shields.io/github/v/release/HarasimowiczKamil/try-monitor?label=latest)](https://github.com/HarasimowiczKamil/try-monitor/releases/latest)

Latest MSI installer is available on the [Releases page](https://github.com/HarasimowiczKamil/try-monitor/releases).

## Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```cmd
npm install
```

### Scripts

| Command                 | Description                        |
|-------------------------|------------------------------------|
| `npm run lint`          | Type-check both renderer and main  |
| `npm run build`         | Build renderer + main process      |
| `npm run start`         | Build + run app                    |
| `npm run package`       | Build + MSI/NSIS installer         |
| `npm run generate-icon` | Generate build/icon.ico            |

### Project structure

```
try-monitor/
├── .github/workflows/      # CI + Release pipelines
├── electron/               # Main process (Node.js)
│   ├── main.ts             # App lifecycle, tray, IPC, checker runner
│   ├── preload.cjs         # Context bridge
│   └── checkers/           # Host checkers (HTTP, Ping)
├── src/                    # Renderer (React)
│   ├── App.tsx             # Root component
│   ├── components/         # Settings, Logs views
│   └── checkers/           # Checker UI forms
├── scripts/                # Build helpers
├── build/                  # App icon
├── dist/                   # Vite output (renderer)
├── dist-electron/          # tsc output (main process)
└── release/                # Packaged installers
```

### Installer

```cmd
.\build.bat                  :: run as Administrator
```
