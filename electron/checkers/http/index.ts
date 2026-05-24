import { HttpConfig, CheckResult } from '../types.js'

export async function checkHttp(config: HttpConfig): Promise<CheckResult> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(config.url, {
      method: config.method,
      signal: controller.signal,
    })
    clearTimeout(timeout)
    const text = await res.text()
    const bodySize = text.length
    const st = res.statusText || ''
    const info = `${res.status}${st ? ' ' + st : ''} (${formatSize(bodySize)})`
    return { ok: res.status === 200, info, status: res.status, bodySize, timestamp: Date.now() }
  } catch {
    return { ok: false, info: 'connection failed', status: 0, bodySize: 0, timestamp: Date.now() }
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
