import { execFile } from 'child_process'
import { PingConfig, CheckResult } from '../types.js'

export async function checkPing(config: PingConfig): Promise<CheckResult> {
  const args = process.platform === 'win32' ? ['-n', '1', config.target] : ['-c', '1', config.target]

  return new Promise((resolve) => {
    const start = Date.now()
    execFile('ping', args, { timeout: 10000 }, (err, stdout) => {
      const elapsed = Date.now() - start

      if (err) {
        return resolve({
          ok: false,
          info: extractError(stdout || err.message) || 'request timed out',
          status: 0,
          bodySize: 0,
          timestamp: Date.now(),
        })
      }

      const timeMatch = stdout.match(/time[=<]\s*(\d+\.?\d*)\s*ms/i)
      if (timeMatch) {
        return resolve({
          ok: true,
          info: `${parseFloat(timeMatch[1])} ms`,
          status: 0,
          bodySize: 0,
          timestamp: Date.now(),
        })
      }

      if (stdout.includes('Reply from') || stdout.includes('bytes from')) {
        return resolve({
          ok: true,
          info: `${elapsed} ms`,
          status: 0,
          bodySize: 0,
          timestamp: Date.now(),
        })
      }

      resolve({
        ok: false,
        info: 'destination unreachable',
        status: 0,
        bodySize: 0,
        timestamp: Date.now(),
      })
    })
  })
}

function extractError(output: string): string {
  const lines = output.split('\n').map(l => l.trim()).filter(Boolean)
  for (const line of lines) {
    if (/unreachable|timed out|timeout|could not find|not known/i.test(line)) {
      return line.replace(/^ping:\s*/i, '').toLowerCase()
    }
  }
  return ''
}
