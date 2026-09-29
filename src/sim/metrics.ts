export type MetricKey = 'co2' | 'temp' | 'rh' | 'pm25' | 'tvoc'
export type Status = 'goed' | 'matig' | 'slecht'
export type Readings = Record<MetricKey, number>

export interface MetricDef {
  key: MetricKey
  label: string
  short: string
  unit: string
  decimals: number
  /** Bereik dat als "goed" geldt */
  good: [number, number]
  /** Bereik dat nog "matig" is; daarbuiten "slecht" */
  ok: [number, number]
  /** Standaard y-as van de grafiek */
  chart: [number, number]
  /** Verschil over 10 minuten dat als stijging/daling telt */
  trendStep: number
  /** Gewicht in de ruimtescore */
  weight: number
  guideline: string
  why: string
  adviceHigh: string
  adviceLow?: string
}

export const METRICS: MetricDef[] = [
  {
    key: 'co2',
    label: 'CO₂',
    short: 'CO₂',
    unit: 'ppm',
    decimals: 0,
    good: [0, 800],
    ok: [0, 1200],
    chart: [400, 1500],
    trendStep: 25,
    weight: 0.4,
    guideline: 'Frisse Scholen: klasse A tot 800 ppm, klasse C tot 1.200 ppm.',
    why: 'Veel CO₂ betekent weinig verse lucht. Boven 1.200 ppm nemen concentratie en alertheid merkbaar af.',
    adviceHigh: 'Zet ramen of deuren open of verhoog de ventilatie. Plan bij lange lessen een korte luchtpauze.',
  },
  {
    key: 'temp',
    label: 'Temperatuur',
    short: 'Temp.',
    unit: '°C',
    decimals: 1,
    good: [20, 24],
    ok: [18, 26],
    chart: [17, 27],
    trendStep: 0.3,
    weight: 0.15,
    guideline: 'Comfortabel leerklimaat: 20–24 °C.',
    why: 'Te warm maakt slaperig, te koud leidt af.',
    adviceHigh: 'Laat de zonwering zakken, ventileer en zet de verwarming lager.',
    adviceLow: 'Sluit ramen en controleer de verwarming.',
  },
  {
    key: 'rh',
    label: 'Luchtvochtigheid',
    short: 'Vocht',
    unit: '%',
    decimals: 0,
    good: [40, 60],
    ok: [30, 70],
    chart: [25, 75],
    trendStep: 1.5,
    weight: 0.1,
    guideline: 'Gezond binnenklimaat: 40–60 % relatieve vochtigheid.',
    why: 'Droge lucht irriteert ogen en keel; vochtige lucht voelt benauwd.',
    adviceHigh: 'Ventileer om vocht af te voeren.',
    adviceLow: 'De lucht is droog: beperk de verwarming en drink voldoende water.',
  },
  {
    key: 'pm25',
    label: 'Fijnstof',
    short: 'PM2.5',
    unit: 'µg/m³',
    decimals: 0,
    good: [0, 15],
    ok: [0, 25],
    chart: [0, 35],
    trendStep: 1.5,
    weight: 0.2,
    guideline: 'WHO-advies: daggemiddelde maximaal 15 µg/m³.',
    why: 'Fijne stofdeeltjes dringen diep door in de longen.',
    adviceHigh: 'Houd buitendeuren dicht en doe stoffig werk met afzuiging aan.',
  },
  {
    key: 'tvoc',
    label: 'Vluchtige stoffen',
    short: 'VOS',
    unit: 'ppb',
    decimals: 0,
    good: [0, 300],
    ok: [0, 1000],
    chart: [0, 1400],
    trendStep: 30,
    weight: 0.15,
    guideline: 'Onder 300 ppb is goed; boven 1.000 ppb direct ventileren.',
    why: 'Komen vrij uit lijm, verf, schoonmaakmiddel en printers. Geeft hoofdpijn en vermoeidheid.',
    adviceHigh: 'Ventileer na praktijkwerk en sluit lijm, verf en schoonmaakmiddel goed af.',
  },
]

export const METRIC = Object.fromEntries(METRICS.map((m) => [m.key, m])) as Record<MetricKey, MetricDef>

export const STATUS_LABEL: Record<Status, string> = { goed: 'Goed', matig: 'Matig', slecht: 'Slecht' }
const RANK: Record<Status, number> = { goed: 0, matig: 1, slecht: 2 }

export function statusOf(def: MetricDef, v: number): Status {
  if (v >= def.good[0] && v <= def.good[1]) return 'goed'
  if (v >= def.ok[0] && v <= def.ok[1]) return 'matig'
  return 'slecht'
}

export function worst(list: Status[]): Status {
  return list.reduce<Status>((a, b) => (RANK[b] > RANK[a] ? b : a), 'goed')
}

export function isWorse(a: Status, b: Status) {
  return RANK[a] > RANK[b]
}

export function isLow(def: MetricDef, v: number) {
  return v < def.good[0]
}

/** 100 = binnen de norm, 85–55 = "matig", onder 55 = "slecht" */
export function scoreOf(def: MetricDef, v: number): number {
  const [g0, g1] = def.good
  const [o0, o1] = def.ok
  if (v >= g0 && v <= g1) return 100
  const low = v < g0
  const dist = low ? g0 - v : v - g1
  const span = low ? g0 - o0 : o1 - g1
  if (dist <= span) return 85 - (30 * dist) / span
  return Math.max(0, 55 - (55 * (dist - span)) / span)
}

/** Gewogen gemiddelde, maar de slechtste meetwaarde telt voor de helft mee */
export function roomScore(r: Readings): number {
  const weighted = METRICS.reduce((sum, m) => sum + scoreOf(m, r[m.key]) * m.weight, 0)
  const lowest = Math.min(...METRICS.map((m) => scoreOf(m, r[m.key])))
  return (weighted + lowest) / 2
}

export function describe(def: MetricDef, v: number, status: Status): string {
  if (status === 'goed') return 'in orde'
  const low = isLow(def, v)
  if (status === 'matig') return low ? 'aan de lage kant' : 'verhoogd'
  return low ? 'te laag' : 'te hoog'
}

const formatters = new Map<number, Intl.NumberFormat>()
export function fmt(v: number, decimals = 0): string {
  let f = formatters.get(decimals)
  if (!f) {
    f = new Intl.NumberFormat('nl-NL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    formatters.set(decimals, f)
  }
  return f.format(v)
}

export function fmtMetric(def: MetricDef, v: number) {
  return `${fmt(v, def.decimals)} ${def.unit}`
}

/** Grenzen in leesbare vorm, bv. "Goed tot 800 · Matig tot 1.200 · daarboven slecht" */
export function thresholdText(def: MetricDef) {
  const d = def.decimals
  if (def.good[0] <= 0) {
    return {
      goed: `tot ${fmt(def.good[1], d)}`,
      matig: `${fmt(def.good[1], d)}–${fmt(def.ok[1], d)}`,
      slecht: `boven ${fmt(def.ok[1], d)}`,
    }
  }
  return {
    goed: `${fmt(def.good[0], d)}–${fmt(def.good[1], d)}`,
    matig: `${fmt(def.ok[0], d)}–${fmt(def.good[0], d)} of ${fmt(def.good[1], d)}–${fmt(def.ok[1], d)}`,
    slecht: `onder ${fmt(def.ok[0], d)} of boven ${fmt(def.ok[1], d)}`,
  }
}
