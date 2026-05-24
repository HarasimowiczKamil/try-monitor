import { useState, useEffect } from 'react'
import Settings from './components/Settings'
import Logs from './components/Logs'

interface Config {
  hosts: any[]
  interval: number
  language: string
  maxLogs: number
}

interface CheckResult {
  ok: boolean
  info: string
  status: number
  bodySize: number
  timestamp: number
}

interface LogEntry {
  timestamp: number
  label: string
  info: string
}

declare global {
  interface Window {
    electronAPI: {
      getConfig: () => Promise<Config>
      saveConfig: (config: Config) => Promise<{ success: boolean }>
      getResults: () => Promise<CheckResult[]>
      getLogs: () => Promise<LogEntry[]>
      onResultsUpdate: (callback: (results: CheckResult[]) => void) => void
      onLogsUpdate: (callback: (entries: LogEntry[]) => void) => void
    }
  }
}

function getView(): string {
  return window.location.hash.slice(1) || 'settings'
}

function App() {
  const [config, setConfig] = useState<Config | null>(null)
  const [results, setResults] = useState<CheckResult[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [view, setView] = useState(getView())

  useEffect(() => {
    const onHashChange = () => setView(getView())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    window.electronAPI.getConfig().then(setConfig)
    window.electronAPI.getResults().then(setResults)
    window.electronAPI.getLogs().then(setLogs)
    window.electronAPI.onResultsUpdate(setResults)
    window.electronAPI.onLogsUpdate(setLogs)
  }, [])

  const handleSave = async (newConfig: Config) => {
    const res = await window.electronAPI.saveConfig(newConfig)
    if (res.success) setConfig(newConfig)
  }

  if (!config) return <div style={{ padding: 20, fontFamily: 'system-ui', color: '#666' }}>Loading...</div>

  if (view === 'logs') return <Logs logs={logs} config={config} />

  return <Settings config={config} results={results} onSave={handleSave} />
}

export default App
