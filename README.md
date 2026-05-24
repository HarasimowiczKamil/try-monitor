# Try Monitor

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

Latest release: [Try Monitor 1.0.0 MSI](https://github.com/HarasimowiczKamil/try-monitor/releases/tag/1.0.0)

## Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```cmd
npm install
```

### Build & Run

```cmd
npm run start       :: build + run
npm run build       :: build only
npm run package     :: build + MSI/NSIS installer
```

### Project structure

```
try-monitor/
├── electron/                # Main process (Node.js)
│   ├── main.ts              # App lifecycle, tray, IPC, checker runner
│   ├── preload.cjs          # Context bridge
│   └── checkers/            # Host checkers (HTTP, Ping)
├── src/                     # Renderer (React)
│   ├── App.tsx              # Root component
│   ├── components/          # Settings, Logs views
│   └── checkers/            # Checker UI forms
├── scripts/                 # Build helpers
├── build/                   # App icon
├── dist/                    # Vite output (renderer)
├── dist-electron/           # tsc output (main process)
└── release/                 # Packaged installers
```

### Installer

```cmd
.\build.bat                  :: run as Administrator
```
