interface HttpConfig {
  type: 'http'
  url: string
  method: 'GET' | 'POST'
}

export function HttpForm({ config, onChange }: {
  config: HttpConfig
  onChange: (c: HttpConfig) => void
}) {
  return (
    <>
      <div className="field-row">
        <label>Metoda / Method</label>
        <select value={config.method} onChange={e => onChange({ ...config, method: e.target.value as 'GET' | 'POST' })}>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
        </select>
      </div>
      <input
        type="text"
        value={config.url}
        onChange={e => onChange({ ...config, url: e.target.value })}
        placeholder="https://example.com"
      />
    </>
  )
}
