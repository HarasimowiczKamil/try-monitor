import { HostConfig, CheckResult } from './types.js'
import { checkHttp } from './http/index.js'
import { checkPing } from './ping/index.js'

export type CheckerFn = (config: HostConfig) => Promise<CheckResult>

export const checkers: Record<string, CheckerFn> = {
  http: checkHttp as CheckerFn,
  ping: checkPing as CheckerFn,
}

export function getLabel(config: HostConfig): string {
  if (config.type === 'http') return config.url
  return config.target
}


