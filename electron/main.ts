import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, Notification } from 'electron'
import path from 'path'
import fs from 'fs'
import fsp from 'fs/promises'
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
  theme: 'light' | 'dark' | 'system'
  notifications: boolean
}

let settingsWindow: BrowserWindow | null = null
let logsWindow: BrowserWindow | null = null
let tray: Tray | null = null
let config: Config = { hosts: [{ type: 'http', url: 'https://google.com', method: 'GET' }], interval: 30, language: 'pl', maxLogs: 100, theme: 'system', notifications: true }
let results: CheckResult[] = []
let logEntries: LogEntry[] = []
let checkTimer: NodeJS.Timeout | null = null

function configPath(): string {
  const appData = process.env.APPDATA || path.join(app.getPath('home'), '.config')
  const dir = path.join(appData, 'try-monitor')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, 'config.json')
}

async function loadConfig(): Promise<Config> {
  try {
    const raw = await fsp.readFile(configPath(), 'utf-8')
    const cfg = JSON.parse(raw)
    if (!cfg.hosts || !Array.isArray(cfg.hosts)) cfg.hosts = [{ type: 'http', url: 'https://google.com', method: 'GET' }]
    if (typeof cfg.interval !== 'number' || cfg.interval < 5) cfg.interval = 30
    if (!cfg.language) cfg.language = 'pl'
    if (typeof cfg.maxLogs !== 'number' || cfg.maxLogs < 1) cfg.maxLogs = 100
    if (!cfg.theme || !['light', 'dark', 'system'].includes(cfg.theme)) cfg.theme = 'system'
    if (typeof cfg.notifications !== 'boolean') cfg.notifications = true
    return cfg
  } catch {
    await saveConfig(config)
    return config
  }
}

async function saveConfig(cfg: Config) {
  await fsp.writeFile(configPath(), JSON.stringify(cfg, null, 2), 'utf-8')
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

function createTrayIcon(size: number, topColor: [number, number, number], bottomColor: [number, number, number]) {
  const buf = Buffer.alloc(size * size * 4, 0)
  const cx = size / 2, cy = size / 2, r = size / 2 - 1
  for (let y = 0; y < size; y++) {
    const t = (y + 0.5) / size
    const r2 = topColor[0] + (bottomColor[0] - topColor[0]) * t
    const g = topColor[1] + (bottomColor[1] - topColor[1]) * t
    const b = topColor[2] + (bottomColor[2] - topColor[2]) * t
    for (let x = 0; x < size; x++) {
      const dx = x - cx + 0.5, dy = y - cy + 0.5
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist <= r) {
        const alpha = dist > r - 0.5 ? Math.round((r - dist + 0.5) * 255) : 255
        const i = (y * size + x) * 4
        buf[i] = b | 0
        buf[i + 1] = g | 0
        buf[i + 2] = r2 | 0
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
  let topColor: [number, number, number], bottomColor: [number, number, number]
  if (total === 0) {
    topColor = [255, 183, 77]; bottomColor = [230, 81, 0]
  } else if (ok === total) {
    topColor = [76, 175, 80]; bottomColor = [27, 94, 32]
  } else if (ok > 0) {
    topColor = [255, 213, 79]; bottomColor = [245, 127, 23]
  } else {
    topColor = [239, 83, 80]; bottomColor = [183, 28, 28]
  }
  tray.setImage(createTrayIcon(16, topColor, bottomColor))
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
  tray = new Tray(createTrayIcon(16, [255, 183, 77], [230, 81, 0]))
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
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    width: isSettings ? 560 : 620,
    height: isSettings ? 460 : 500,
    resizable: false,
    title: (isSettings
      ? (config.language === 'pl' ? 'Ustawienia' : 'Settings')
      : (config.language === 'pl' ? 'Logi' : 'Logs')) + ' — Try Monitor',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
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

const previousOk = new Map<string, boolean>()

function sendNotifications(entries: CheckResult[]) {
  if (!config.notifications) return
  for (let i = 0; i < entries.length; i++) {
    const label = getLabel(config.hosts[i])
    const wasOk = previousOk.get(label)
    if (!entries[i].ok && wasOk !== false) {
      new Notification({ title: label, body: entries[i].info }).show()
    }
    previousOk.set(label, entries[i].ok)
  }
}

function startChecker() {
  if (checkTimer) clearInterval(checkTimer)
  const run = async () => {
    if (config.hosts.length === 0) {
      results = []
      updateTray()
      return
    }
    results = await runChecks()
    sendNotifications(results)
    appendLogs(results)
    updateTray()
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.webContents.send('results-update', results)
    }
  }
  run()
  checkTimer = setInterval(run, config.interval * 1000)
}

app.setAppUserModelId('TryMonitor')

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null)
  config = await loadConfig()
  createTray()
  startChecker()
})

app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const allowedPrefix = process.env.VITE_DEV_SERVER_URL || 'file://'
    if (!navigationUrl.startsWith(allowedPrefix)) {
      event.preventDefault()
    }
  })
})

process.on('SIGINT', () => {
  if (checkTimer) clearInterval(checkTimer)
  app.quit()
})

app.on('before-quit', () => {
  if (checkTimer) clearInterval(checkTimer)
  tray?.destroy()
})

app.on('window-all-closed', () => {})

function isValidSender(frame: Electron.WebFrameMain | null): boolean {
  if (!frame) return false
  const allowedPrefix = process.env.VITE_DEV_SERVER_URL || 'file://'
  return frame.url.startsWith(allowedPrefix)
}

ipcMain.handle('get-config', () => config)
ipcMain.handle('save-config', async (event, newConfig: Config) => {
  if (!isValidSender(event.senderFrame)) return { success: false }
  config = newConfig
  await saveConfig(config)
  updateMenu()
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.setTitle((config.language === 'pl' ? 'Ustawienia' : 'Settings') + ' — Try Monitor')
  }
  if (logsWindow && !logsWindow.isDestroyed()) {
    logsWindow.setTitle((config.language === 'pl' ? 'Logi' : 'Logs') + ' — Try Monitor')
  }
  startChecker()
  return { success: true }
})
ipcMain.handle('get-results', () => results)
ipcMain.handle('get-logs', () => logEntries)

