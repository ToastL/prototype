import { METRIC, type MetricKey } from './metrics'
import type { RoomState } from './useAirSensors'

const timeFmt = new Intl.DateTimeFormat('nl-NL', { hour: '2-digit', minute: '2-digit' })
const dayFmt = new Intl.DateTimeFormat('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })

export const fmtTime = (t: number) => timeFmt.format(t)
export const fmtDay = (t: number) => dayFmt.format(t)

/** -1 daalt, 0 stabiel, 1 stijgt — vergeleken met 10 minuten geleden */
export function trendOf(r: RoomState, key: MetricKey): -1 | 0 | 1 {
  const h = r.history[key]
  if (h.length < 11) return 0
  const diff = r.reading[key] - h[h.length - 11]
  const step = METRIC[key].trendStep
  return diff > step ? 1 : diff < -step ? -1 : 0
}

export const TREND_LABEL = { '-1': 'daalt', '0': 'stabiel', '1': 'stijgt' } as const
