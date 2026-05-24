import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { HostConfig, CheckResult, LogEntry } from './checkers/types.js'
import { checkers, getLabel } from './checkers/registry.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface Config {
  hosts: HostConfig[]
  interval: number
  language: string
  maxLogs: number
}

let settingsWindow: BrowserWindow | null = null
let logsWindow: BrowserWindow | null = null
let tray: Tray | null = null
let config: Config = { hosts: [{ type: 'http', url: 'https://google.com', method: 'GET' }], interval: 30, language: 'pl', maxLogs: 100 }
let results: CheckResult[] = []
let logEntries: LogEntry[] = []
let checkTimer: NodeJS.Timeout | null = null

function configPath(): string {
  const appData = process.env.APPDATA || path.join(app.getPath('home'), '.config')
  const dir = path.join(appData, 'try-monitor')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, 'config.json')
}

function loadConfig(): Config {
  try {
    const raw = fs.readFileSync(configPath(), 'utf-8')
    const cfg = JSON.parse(raw)
    if (!cfg.hosts || !Array.isArray(cfg.hosts)) cfg.hosts = [{ type: 'http', url: 'https://google.com', method: 'GET' }]
    if (typeof cfg.interval !== 'number' || cfg.interval < 5) cfg.interval = 30
    if (!cfg.language) cfg.language = 'pl'
    if (typeof cfg.maxLogs !== 'number' || cfg.maxLogs < 1) cfg.maxLogs = 100
    return cfg
  } catch {
    saveConfig(config)
    return config
  }
}

function saveConfig(cfg: Config) {
  fs.writeFileSync(configPath(), JSON.stringify(cfg, null, 2), 'utf-8')
}

function runChecks(): Promise<CheckResult[]> {
  return Promise.all(config.hosts.map(async (host) => {
    const check = checkers[host.type]
    if (!check) return { ok: false, info: `unknown type: ${host.type}`, status: 0, bodySize: 0, timestamp: Date.now() }
    return await check(host)
  }))
}

function appendLogs(entries: CheckResult[]) {
  for (let i = 0; i < entries.length; i++) {
    const host = config.hosts[i]
    logEntries.push({
      timestamp: entries[i].timestamp,
      label: getLabel(host),
      info: entries[i].info,
    })
  }
  // keep maxLogs entries per host label (newest)
  const counts = new Map<string, number>()
  const keep: LogEntry[] = []
  for (let i = logEntries.length - 1; i >= 0; i--) {
    const e = logEntries[i]
    const c = counts.get(e.label) || 0
    if (c < config.maxLogs) {
      keep.push(e)
      counts.set(e.label, c + 1)
    }
  }
  logEntries = keep.reverse()
  if (logsWindow && !logsWindow.isDestroyed()) {
    logsWindow.webContents.send('logs-update', logEntries)
  }
}

function createTrayIcon(size: number, color: [number, number, number]) {
  const buf = Buffer.alloc(size * size * 4, 0)
  const cx = size / 2, cy = size / 2, r = size / 2 - 1
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx + 0.5, dy = y - cy + 0.5
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist <= r) {
        const alpha = dist > r - 0.5 ? Math.round((r - dist + 0.5) * 255) : 255
        const i = (y * size + x) * 4
        buf[i] = color[0]
        buf[i + 1] = color[1]
        buf[i + 2] = color[2]
        buf[i + 3] = alpha
      }
    }
  }
  return nativeImage.createFromBuffer(buf, { width: size, height: size })
}

function updateTray() {
  if (!tray) return
  const total = results.length
  const ok = results.filter(r => r.ok).length
  let color: [number, number, number]
  if (total === 0) {
    color = [255, 165, 0]
  } else if (ok === total) {
    color = [0, 200, 0]
  } else if (ok > 0) {
    color = [255, 200, 0]
  } else {
    color = [220, 30, 30]
  }
  tray.setImage(createTrayIcon(16, color))
  tray.setToolTip(config.language === 'pl'
    ? `${ok}/${total} hostów OK`
    : `${ok}/${total} hosts OK`)
}

function loadURL(win: BrowserWindow, hash: string) {
  const url = process.env.VITE_DEV_SERVER_URL
    ? `${process.env.VITE_DEV_SERVER_URL}/#${hash}`
    : `file://${path.join(__dirname, '../dist/index.html').replace(/\\/g, '/')}#${hash}`
  win.loadURL(url)
}

function createTray() {
  tray = new Tray(createTrayIcon(16, [255, 165, 0]))
  tray.setToolTip('Try Monitor')
  tray.on('click', () => tray?.popUpContextMenu())
  updateMenu()
}

function updateMenu() {
  if (!tray) return
  const t = (key: string): string => {
    const labels: Record<string, Record<string, string>> = {
      pl: { settings: 'Ustawienia', logs: 'Logi', quit: 'Zamknij' },
      en: { settings: 'Settings', logs: 'Logs', quit: 'Quit' },
    }
    return labels[config.language]?.[key] || labels.en[key] || key
  }
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: t('settings'), click: () => openSettings() },
    { label: t('logs'), click: () => openLogs() },
    { type: 'separator' },
    { label: t('quit'), click: () => app.quit() },
  ]))
}

function openWindow(type: 'settings' | 'logs') {
  const existing = type === 'settings' ? settingsWindow : logsWindow
  if (existing && !existing.isDestroyed()) { existing.focus(); return }

  const isSettings = type === 'settings'
  const win = new BrowserWindow({
    width: isSettings ? 560 : 620,
    height: isSettings ? 460 : 500,
    resizable: false,
    title: isSettings
      ? (config.language === 'pl' ? 'Ustawienia' : 'Settings')
      : (config.language === 'pl' ? 'Logi' : 'Logs'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  loadURL(win, type)

  if (type === 'settings') {
    settingsWindow = win
    win.on('closed', () => { settingsWindow = null })
  } else {
    logsWindow = win
    win.on('closed', () => { logsWindow = null })
  }
}

function openSettings() { openWindow('settings') }
function openLogs() { openWindow('logs') }

function startChecker() {
  if (checkTimer) clearInterval(checkTimer)
  const run = async () => {
    if (config.hosts.length === 0) {
      results = []
      updateTray()
      return
    }
    results = await runChecks()
    appendLogs(results)
    updateTray()
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.webContents.send('results-update', results)
    }
  }
  run()
  checkTimer = setInterval(run, config.interval * 1000)
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  config = loadConfig()
  createTray()
  startChecker()
})

app.on('window-all-closed', () => {})

ipcMain.handle('get-config', () => config)
ipcMain.handle('save-config', (_event, newConfig: Config) => {
  config = newConfig
  saveConfig(config)
  updateMenu()
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.setTitle(config.language === 'pl' ? 'Ustawienia' : 'Settings')
  }
  startChecker()
  return { success: true }
})
ipcMain.handle('get-results', () => results)
ipcMain.handle('get-logs', () => logEntries)

