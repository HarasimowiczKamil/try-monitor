export type CheckerType = 'http' | 'ping'

export interface HttpConfig {
  type: 'http'
  url: string
  method: 'GET' | 'POST'
}

export interface PingConfig {
  type: 'ping'
  target: string
}

export type HostConfig = HttpConfig | PingConfig

export interface CheckResult {
  ok: boolean
  info: string
  status: number
  bodySize: number
  timestamp: number
}

export interface LogEntry {
  timestamp: number
  label: string
  info: string
}
