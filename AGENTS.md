# Try Monitor

Electron + TypeScript + React desktop app for HTTP/Ping host monitoring in system tray.

## Stack
- **Runtime**: Electron 31
- **Frontend**: React 18 + Vite 5 + TypeScript 5
- **Build**: Vite (renderer), tsc (main process), electron-builder (packaging)
- **Module**: `"type": "module"` in package.json; main process compiled to ESM (Electron 30+ supports it)

## Project Structure
```
try-monitor/
├── electron/
│   ├── main.ts                  # Main process: tray, config, checker runner, IPC
│   ├── preload.cjs              # Context bridge (contextIsolation: true, CommonJS)
│   └── checkers/
│       ├── types.ts             # Shared types (HostConfig, CheckResult, LogEntry)
│       ├── registry.ts          # Checker registry (type → check function)
│       ├── http/
│       │   └── index.ts         # HTTP checker: fetch with GET/POST, timeout, body size
│       └── ping/
│           └── index.ts         # Ping checker: exec ping.exe, parse response time
├── src/
│   ├── main.tsx                 # React entry point
│   ├── App.tsx                  # Root component with hash routing (settings/logs)
│   ├── App.css                  # Win11 native styles, light/dark via prefers-color-scheme
│   ├── checkers/
│   │   ├── registry.tsx         # Checker UI registry (type → form component + label)
│   │   ├── http.tsx             # HTTP add form (URL + method select)
│   │   └── ping.tsx             # Ping add form (target input)
│   └── components/
│       ├── Settings.tsx         # Settings window with tabs (Monitor, General)
│       └── Logs.tsx             # Log viewer (flat list: time, label, info)
├── translations/
│   ├── pl.json
│   └── en.json
├── dist/                        # Vite build output (renderer)
├── dist-electron/               # TypeScript output (main process)
├── index.html                   # HTML entry with CSP
├── package.json
├── vite.config.ts
├── tsconfig.json                # Renderer TS config
├── tsconfig.node.json           # Main process TS config
└── AGENTS.md
```

## Checker System
Each checker lives in `electron/checkers/<type>/` with its own directory:
- **HTTP** (`electron/checkers/http/`): `fetch` with GET/POST, 10s timeout, returns status + body size
- **Ping** (`electron/checkers/ping/`): `ping.exe` subprocess, parses response time in ms

### Adding a new checker:
1. Create `electron/checkers/<type>/index.ts` exporting `async function check<Type>(config: HostConfig): Promise<CheckResult>`
2. Register it in `electron/checkers/registry.ts`
3. Create `src/checkers/<type>.tsx` exporting a React form component
4. Register the UI in `src/checkers/registry.tsx` (provide `getName`, `FormComponent`, `label`, `description`)

The type selector in the add-host dialog is a `<select>` populated dynamically from the UI registry with name and description.

## Scripts
| Command                                   | Description                              |
|-------------------------------------------|------------------------------------------|
| `vite build`                              | Build renderer to `dist/`                |
| `tsc -p tsconfig.node.json`               | Compile main process to `dist-electron/` |
| `vite build && tsc -p tsconfig.node.json` | Full build                               |
| `electron .`                              | Run the app (after build)                |
| `electron-builder`                        | Package for distribution                 |

## Key Files
- `electron/main.ts`: App lifecycle, tray icon (16x16 RGBA colored circle), config load/save (`%APPDATA%/try-monitor/config.json`), checker runner with `startChecker()`, IPC handlers, two BrowserWindows (settings + logs) with hash routing
- `electron/preload.cjs`: `contextBridge.exposeInMainWorld('electronAPI', ...)` — `getConfig`, `saveConfig`, `getResults`, `getLogs`, `onResultsUpdate`, `onLogsUpdate`
- `electron/checkers/registry.ts`: Maps checker type → async check function, `getLabel()` helper, `getCheckerTypes()`
- `src/App.tsx`: Hash-based routing (`#settings` / `#logs`), loads config/results/logs on mount, subscribes to live updates
- `src/checkers/registry.tsx`: Maps checker type → React form component + label translations, `getLabel()` helper
- `src/components/Settings.tsx`: Two tabs (Monitor hosts list, General settings), add-host dialog with dynamic type-specific form

## Config
- Path: `%APPDATA%/try-monitor/config.json`
- Fields: `hosts` (HostConfig[]), `interval` (number, seconds, min 5), `language` (string), `maxLogs` (number, min 1)

## Tray Icon
- 16x16 RGBA buffer generated in `createTrayIcon()` in `electron/main.ts`
- Colors: green (all OK), yellow (partial), red (all down), orange (checking)
- Tooltip shows `{ok}/{total} hosts OK` (or Polish version)
- Left-click also opens context menu

## Logs
- Flat list: timestamp | host label | result info
- HTTP example: `12:34:56  https://example.com  200 OK (1.2 KB)`
- Ping example: `12:34:57  google.com  12 ms`

## Building
```powershell
# Fix npm not in PATH (PowerShell issue):
$env:Path += ";C:\Program Files\nodejs;C:\path\to\project\node_modules\.bin"

# Build:
npx vite build
npx tsc -p tsconfig.node.json
copy /Y electron\preload.cjs dist-electron\preload.cjs

# Run:
npx electron .
```

## Electron Binary Issues
- `npm install` downloads electron but install.js may fail silently
- Manual fix: `Expand-Archive` the cached zip from `%LOCALAPPDATA%\electron\Cache\*\*.zip` into `node_modules\electron\dist`, then write `electron.exe` to `node_modules\electron\path.txt`
- Ensure `path.txt` contains just `electron.exe` (no newline)
