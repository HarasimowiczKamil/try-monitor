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
│   ├── preload.cjs              # Context bridge (contextIsolation: true, sandbox: true)
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
├── scripts/
│   └── generate-icon.mjs        # Generates build/icon.ico (16, 32, 48px circle icon)
├── build/
│   └── icon.ico                 # App icon for electron-builder
├── dist/                        # Vite build output (renderer)
├── dist-electron/               # TypeScript output (main process)
├── index.html                   # HTML entry with CSP (default-src 'self')
├── electron-builder.yml         # NSIS installer config
├── build.bat                    # Full build automation script (run as Admin)
├── package.json
├── vite.config.ts
├── tsconfig.json                # Renderer TS config
├── tsconfig.node.json           # Main process TS config
├── AGENTS.md
└── .gitignore
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
| Command                                         | Description                              |
|-------------------------------------------------|------------------------------------------|
| `npm run generate-icon`                         | Generate `build/icon.ico` (16/32/48 px)  |
| `npm run build`                                 | Build renderer + main process            |
| `npm run start`                                 | Build + run app                          |
| `npm run package`                               | Full build + NSIS installer              |
| `npm run dev:renderer`                          | Vite dev server                          |
| `npm run dev:electron`                          | Compile main + run electron              |
| `.\build.bat`                                   | Full build + installer (run as Admin)    |

## Key Files
- `electron/main.ts`: App lifecycle, tray icon (16x16 RGBA colored circle), config load/save (`%APPDATA%/try-monitor/config.json`), checker runner with `startChecker()`, IPC handlers, two BrowserWindows (settings + logs) with hash routing
- `electron/preload.cjs`: `contextBridge.exposeInMainWorld('electronAPI', ...)` — `getConfig`, `saveConfig`, `getResults`, `getLogs`, `onResultsUpdate`, `onLogsUpdate`
- `electron/checkers/registry.ts`: Maps checker type → async check function, `getLabel()` helper, `getCheckerTypes()`
- `src/App.tsx`: Hash-based routing (`#settings` / `#logs`), loads config/results/logs on mount, subscribes to live updates
- `src/checkers/registry.tsx`: Maps checker type → React form component + label translations, `getLabel()` helper
- `src/components/Settings.tsx`: Two tabs (Monitor hosts list, General settings), add-host dialog with dynamic type-specific form
- `scripts/generate-icon.mjs`: Generates `build/icon.ico` with a green circle in 3 sizes

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

## Security Checklist
- `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true` on all BrowserWindows
- CSP via `<meta>` tag: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'`
- `will-navigate` handler blocks navigation outside `file://` or VITE_DEV_SERVER_URL
- `save-config` IPC validates `event.senderFrame.url` before accepting
- Preload uses `contextBridge.exposeInMainWorld` with callback wrapping (no raw `ipcRenderer` exposed)
- `Menu.setApplicationMenu(null)` called at startup
- Config I/O uses async `fs/promises` (non-blocking)

## Building
```cmd
:: Quick build + run:
npm run start

:: Full installer:
npm run package

:: Or via build.bat (run As Administrator for winCodeSign):
.\build.bat
```

## Electron Binary Issues
- `npm install` downloads electron but install.js may fail silently
- Manual fix: `Expand-Archive` the cached zip from `%LOCALAPPDATA%\electron\Cache\*\*.zip` into `node_modules\electron\dist`, then write `electron.exe` to `node_modules\electron\path.txt`
- Ensure `path.txt` contains just `electron.exe` (no newline)
- `npm run` uses `node_modules\.bin` so it works without adding npm to PATH; for bare `npx` calls, prepend `$env:Path += ";C:\Program Files\nodejs"` in PowerShell
- PowerShell blocks `npm.ps1` by default (execution policy); use `npm.cmd` instead (e.g., `& "C:\Program Files\nodejs\npm.cmd" run build`)
