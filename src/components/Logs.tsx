interface LogEntry {
  timestamp: number
  label: string
  info: string
}

interface Config {
  hosts: never[]
  interval: number
  language: string
  maxLogs: number
}

interface Props {
  logs: LogEntry[]
  config: Config
}

const translations: Record<string, Record<string, string>> = {
  pl: { empty: 'Brak wpisów' },
  en: { empty: 'No entries' },
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString()
}

export default function Logs({ logs, config }: Props) {
  const t = (key: string) => translations[config.language]?.[key] || translations.en[key] || key

  return (
    <div className="logs">
      <div className="log-list">
        {logs.length === 0 ? (
          <div className="empty-list">{t('empty')}</div>
        ) : (
          <div className="log-entries">
            {[...logs].reverse().map((entry, i) => (
              <div key={i} className="log-entry">
                <span className="log-time">{formatTime(entry.timestamp)}</span>
                <span className="log-label">{entry.label}</span>
                <span className="log-info">{entry.info}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
