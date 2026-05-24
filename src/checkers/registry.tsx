import { ReactNode } from 'react'

export interface CheckerUIDef {
  type: string
  label: Record<string, string>
  description: Record<string, string>
  FormComponent: (props: {
    config: any
    onChange: (config: any) => void
  }) => ReactNode
  getName: (config: any) => string
}

import { HttpForm } from './http'
import { PingForm } from './ping'

export const checkerUIRegistry: Record<string, CheckerUIDef> = {
  http: {
    type: 'http',
    label: { pl: 'HTTP', en: 'HTTP' },
    description: { pl: 'sprawdza kod odpowiedzi i rozmiar', en: 'checks status code and body size' },
    FormComponent: HttpForm,
    getName: (c) => `${c.method} ${c.url}`,
  },
  ping: {
    type: 'ping',
    label: { pl: 'Ping', en: 'Ping' },
    description: { pl: 'sprawdza czas odpowiedzi ICMP', en: 'checks ICMP response time' },
    FormComponent: PingForm,
    getName: (c) => c.target,
  },
}
