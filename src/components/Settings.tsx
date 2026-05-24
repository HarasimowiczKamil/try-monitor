import { useState, useEffect, useCallback, useRef } from 'react'
import { checkerUIRegistry } from '../checkers/registry'

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

interface Props {
  config: Config
  results: CheckResult[]
  onSave: (config: Config) => Promise<void>
}

const translations: Record<string, Record<string, string>> = {
  pl: {
    hosts_tab: 'Monitor',
    general_tab: 'Ogólne',
    hosts: 'Hosty do monitorowania',
    interval: 'Interwał sprawdzania',
    interval_unit: 's',
    language: 'Język',
    max_logs: 'Zachowane logi',
    type: 'Typ',
    name: 'Nazwa',
    add: 'Dodaj',
    cancel: 'Anuluj',
    add_monitor: 'Dodaj monitor',
    no_hosts: 'Dodaj co najmniej jeden host',
    last_check: 'Ostatnie sprawdzenie',
    invalid_config: 'Nieprawidłowa konfiguracja',
    duplicate: 'Taki monitor już istnieje',
  },
  en: {
    hosts_tab: 'Monitor',
    general_tab: 'General',
    hosts: 'Hosts to monitor',
    interval: 'Check interval',
    interval_unit: 's',
    language: 'Language',
    max_logs: 'Keep logs',
    type: 'Type',
    name: 'Name',
    add: 'Add',
    cancel: 'Cancel',
    add_monitor: 'Add monitor',
    no_hosts: 'Add at least one host',
    last_check: 'Last check',
    invalid_config: 'Invalid configuration',
    duplicate: 'This monitor already exists',
  },
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString()
}

export default function Settings({ config, results, onSave }: Props) {
  const t = (key: string) => translations[config.language]?.[key] || translations.en[key] || key

  const [tab, setTab] = useState(0)
  const [hosts, setHosts] = useState<any[]>([...config.hosts])
  const [interval, setInterval] = useState(config.interval.toString())
  const [language, setLanguage] = useState(config.language)
  const [maxLogs, setMaxLogs] = useState(config.maxLogs.toString())
  const [showDialog, setShowDialog] = useState(false)
  const [selectedType, setSelectedType] = useState('http')
  const [newConfig, setNewConfig] = useState<any>({ type: 'http', url: '', method: 'GET' })
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const uiDefs = Object.values(checkerUIRegistry)
  const currentUIDef = checkerUIRegistry[selectedType]

  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave
  const isFirstRender = useRef(true)

  const doSave = useCallback((h: any[], i: string, l: string, m: string) => {
    const intervalNum = parseInt(i, 10)
    const maxLogsNum = parseInt(m, 10)
    if (h.length > 0 && !isNaN(intervalNum) && intervalNum >= 5 && !isNaN(maxLogsNum) && maxLogsNum >= 1) {
      onSaveRef.current({ hosts: h, interval: intervalNum, language: l, maxLogs: maxLogsNum })
    }
  }, [])

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    doSave(hosts, interval, language, maxLogs)
  }, [hosts, interval, language, maxLogs, doSave])

  useEffect(() => {
    if (showDialog && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showDialog, selectedType])

  const openAddDialog = (type?: string) => {
    const t = type || uiDefs[0]?.type || 'http'
    const def = checkerUIRegistry[t]
    if (!def) return
    setSelectedType(t)
    if (t === 'http') setNewConfig({ type: 'http', url: '', method: 'GET' })
    else if (t === 'ping') setNewConfig({ type: 'ping', target: '' })
    else setNewConfig({ type: t })
    setError('')
    setShowDialog(true)
  }

  const addHost = () => {
    const cfg = { ...newConfig }
    const name = currentUIDef?.getName(cfg)
    if (!name) { setError(t('invalid_config')); return }

    if (currentUIDef?.type === 'http') {
      cfg.url = cfg.url?.trim()
      if (!cfg.url?.startsWith('http://') && !cfg.url?.startsWith('https://')) {
        setError(t('invalid_config')); return
      }
    } else if (currentUIDef?.type === 'ping') {
      cfg.target = cfg.target?.trim()
      if (!cfg.target) { setError(t('invalid_config')); return }
    }

    if (hosts.some((h: any) => h.type === selectedType && checkerUIRegistry[selectedType]?.getName(h) === name)) {
      setError(t('duplicate')); return
    }

    setHosts([...hosts, cfg])
    setShowDialog(false)
    setError('')
  }

  const removeHost = (index: number) => {
    setHosts(hosts.filter((_, i) => i !== index))
  }

  const intervalNum = parseInt(interval, 10)
  const intervalValid = !isNaN(intervalNum) && intervalNum >= 5
  const maxLogsNum = parseInt(maxLogs, 10)
  const maxLogsValid = !isNaN(maxLogsNum) && maxLogsNum >= 1

  return (
    <div className="settings">
      <div className="tabs">
        <button className={'tab' + (tab === 0 ? ' active' : '')} onClick={() => setTab(0)}>{t('hosts_tab')}</button>
        <button className={'tab' + (tab === 1 ? ' active' : '')} onClick={() => setTab(1)}>{t('general_tab')}</button>
      </div>

      {tab === 0 && (
        <div className="tab-content">
          <div className="section-header">
            <span className="section-title">{t('hosts')}</span>
            <button className="add-btn" onClick={() => openAddDialog()} title={t('add_monitor')}>+</button>
          </div>
          <div className="host-list">
            {hosts.length === 0 ? (
              <div className="empty-list">{t('no_hosts')}</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>{t('type')}</th>
                    <th>{t('name')}</th>
                    <th>{t('last_check')}</th>
                    <th style={{ width: 30 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {hosts.map((host, i) => {
                    const def = checkerUIRegistry[host.type]
                    const name = def?.getName(host) || '-'
                    const res = results[i]
                    return (
                      <tr key={i}>
                        <td><span className={'type-badge type-' + host.type}>{(def?.label[language] || host.type).toUpperCase()}</span></td>
                        <td className="host-cell">{name}</td>
                        <td className={res ? (res.ok ? 'status-ok' : 'status-fail') : ''}>{res ? formatTime(res.timestamp) : '-'}</td>
                        <td><button className="delete-btn" onClick={() => removeHost(i)}>✖</button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 1 && (
        <div className="tab-content">
          <div className="field-row">
            <label>{t('interval')}</label>
            <div className="field-control">
              <input type="number" value={interval} onChange={e => setInterval(e.target.value)} min={5} className={!intervalValid ? 'input-error' : ''} />
              <span className="field-unit">{t('interval_unit')}</span>
            </div>
          </div>
          <div className="field-row">
            <label>{t('language')}</label>
            <select value={language} onChange={e => setLanguage(e.target.value)}>
              <option value="pl">polski</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="field-row">
            <label>{t('max_logs')}</label>
            <div className="field-control">
              <input type="number" value={maxLogs} onChange={e => setMaxLogs(e.target.value)} min={1} className={!maxLogsValid ? 'input-error' : ''} />
            </div>
          </div>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {showDialog && (
        <div className="dialog-overlay" onClick={() => { setShowDialog(false); setError('') }}>
          <div className="dialog" onClick={e => e.stopPropagation()}>
            <h3>{t('add_monitor')}</h3>

            <div className="dialog-select-type">
              <select value={selectedType} onChange={e => openAddDialog(e.target.value)}>
                {uiDefs.map(def => (
                  <option key={def.type} value={def.type}>
                    {def.label[language] || def.type} — {def.description[language] || ''}
                  </option>
                ))}
              </select>
            </div>

            {currentUIDef && (
              <div className="dialog-fields">
                <currentUIDef.FormComponent
                  config={newConfig}
                  onChange={setNewConfig}
                />
              </div>
            )}

            <div className="dialog-buttons">
              <button className="primary" onClick={addHost}>{t('add')}</button>
              <button onClick={() => { setShowDialog(false); setError('') }}>{t('cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
