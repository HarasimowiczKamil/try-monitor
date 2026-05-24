interface PingConfig {
  type: 'ping'
  target: string
}

export function PingForm({ config, onChange }: {
  config: PingConfig
  onChange: (c: PingConfig) => void
}) {
  return (
    <input
      type="text"
      value={config.target}
      onChange={e => onChange({ ...config, target: e.target.value })}
      placeholder="google.com"
    />
  )
}
