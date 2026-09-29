import { computed, markRaw, reactive } from 'vue'
import {
  METRIC,
  METRICS,
  describe,
  fmtMetric,
  isWorse,
  roomScore,
  statusOf,
  worst,
  type MetricKey,
  type Readings,
  type Status,
} from './metrics'
import { ROOMS, slotAt, type RoomDef } from './rooms'

export type Boost = 'uit' | 'handmatig' | 'automatisch'

export interface History {
  t: number[]
  co2: number[]
  temp: number[]
  rh: number[]
  pm25: number[]
  tvoc: number[]
}

export interface RoomState {
  id: string
  def: RoomDef
  occupancy: number
  /** Werkelijke (gesimuleerde) waarde */
  value: Readings
  /** Wat de sensor meldt: waarde + meetruis */
  reading: Readings
  status: Record<MetricKey, Status>
  boost: Boost
  history: History
}

export interface Alert {
  id: number
  time: number
  roomId: string
  roomName: string
  level: Status | 'info'
  title: string
  detail: string
}

const BOOST_FACTOR = 3
const CO2_PER_PERSON = 17000 // (L/u per persoon) omgerekend naar ppm·m³/u
const HISTORY_MINUTES = 240
const SUBSTEP = 30
const NOISE: Readings = { co2: 7, temp: 0.06, rh: 0.4, pm25: 0.5, tvoc: 9 }

export const SPEEDS = [
  { value: 0, label: 'Pauze' },
  { value: 1, label: '1×' },
  { value: 60, label: '60×' },
  { value: 300, label: '300×' },
]

function hash(str: string) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) / 4294967295) * 2 - 1
}

function noise() {
  // Benadering van een normale verdeling (som van uniforme getallen)
  return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5
}

function outdoorAt(date: Date): Readings {
  const h = date.getHours() + date.getMinutes() / 60
  const temp = 12.5 + 4.5 * Math.sin(((h - 9) / 24) * 2 * Math.PI)
  return {
    temp,
    rh: Math.min(95, Math.max(45, 92 - (temp - 8) * 3.2)),
    co2: 418 + 16 * Math.exp(-((h - 8.2) ** 2) / 1.2) + 9 * Math.exp(-((h - 17) ** 2) / 1.5),
    pm25: 7.5 + 3.5 * Math.exp(-((h - 8.5) ** 2) / 2) + 1.5 * Math.sin(h / 3),
    tvoc: 45 + 12 * Math.sin(h / 2),
  }
}

function emptyHistory(): History {
  return { t: [], co2: [], temp: [], rh: [], pm25: [], tvoc: [] }
}

function makeRoom(def: RoomDef, outside: Readings): RoomState {
  const value: Readings = {
    co2: outside.co2 + 15,
    temp: def.tempBase - 1.2,
    rh: def.rhBase,
    pm25: outside.pm25 * def.pmIn,
    tvoc: def.tvocBase,
  }
  return {
    id: def.id,
    def: markRaw(def),
    occupancy: 0,
    value,
    reading: { ...value },
    status: { co2: 'goed', temp: 'goed', rh: 'goed', pm25: 'goed', tvoc: 'goed' },
    boost: 'uit',
    history: emptyHistory(),
  }
}

function atTime(h: number, min: number) {
  const d = new Date()
  d.setHours(h, min, 0, 0)
  return d.getTime()
}

const START = { warmupFrom: [7, 0], now: [10, 52] } as const

const state = reactive({
  time: 0,
  speed: 60,
  autoVent: false,
  rooms: [] as RoomState[],
  outdoor: outdoorAt(new Date()),
  alerts: [] as Alert[],
  lastUpdate: Date.now(),
})

let nextSample = 0
let alertId = 0
let timer: ReturnType<typeof setInterval> | undefined

function pushAlert(r: RoomState, level: Alert['level'], title: string, detail: string) {
  state.alerts.unshift({ id: ++alertId, time: state.time, roomId: r.id, roomName: r.def.name, level, title, detail })
  if (state.alerts.length > 60) state.alerts.length = 60
}

function setBoost(r: RoomState, boost: Boost, reason = '') {
  if (r.boost === boost) return
  const wasOn = r.boost !== 'uit'
  r.boost = boost
  if (boost !== 'uit' && !wasOn) {
    pushAlert(r, 'info', 'Ventilatie verhoogd', boost === 'automatisch' ? `Automatisch · ${reason}` : 'Handmatig aangezet')
  } else if (boost === 'uit' && wasOn) {
    pushAlert(r, 'info', 'Ventilatie weer normaal', reason || 'Handmatig uitgezet')
  }
}

function stepRoom(r: RoomState, dt: number, date: Date, outside: Readings) {
  const d = r.def
  const { slot, index } = slotAt(date)
  let frac = d.profile[slot.period] ?? 0
  if (slot.period === 'les' && d.blocks && slot.block) frac = d.blocks[slot.block - 1] ?? frac
  const variation = hash(`${d.id}-${index}-${date.toDateString()}`)
  const targetN = d.capacity * Math.min(1, frac * (1 + 0.12 * variation))
  r.occupancy += (targetN - r.occupancy) * (1 - Math.exp(-dt / 240))

  const event = slot.period === 'les' ? d.events?.find((e) => e.block === slot.block) : undefined
  const boost = r.boost === 'uit' ? 1 : BOOST_FACTOR
  const q = d.ventilation * boost
  const volume = d.area * d.height
  const occ = r.occupancy / d.capacity
  const v = r.value

  const co2Target = outside.co2 + (r.occupancy * CO2_PER_PERSON) / q
  v.co2 += (co2Target - v.co2) * (1 - Math.exp(-((q / volume) * dt) / 3600))

  const cooling = boost > 1 ? Math.max(0, d.tempBase - outside.temp) * 0.12 : 0
  const tempTarget = d.tempBase + d.heatGain * occ - cooling
  v.temp += (tempTarget - v.temp) * (1 - Math.exp(-dt / 2700))

  const rhTarget = d.rhBase + 12 * occ - (boost > 1 ? 5 : 0)
  v.rh += (rhTarget - v.rh) * (1 - Math.exp(-dt / 1800))

  const pmTarget = outside.pm25 * d.pmIn + (d.pmAct * occ + (event?.pm25 ?? 0)) / boost ** 0.7
  v.pm25 += (pmTarget - v.pm25) * (1 - Math.exp(-dt / 1200))

  const tvocTarget = d.tvocBase / boost ** 0.4 + (d.tvocAct * occ + (event?.tvoc ?? 0)) / boost ** 0.8
  v.tvoc += (tvocTarget - v.tvoc) * (1 - Math.exp(-dt / 1500))
}

function evaluate(r: RoomState) {
  for (const m of METRICS) {
    const value = r.value[m.key]
    const next = statusOf(m, value)
    const prev = r.status[m.key]
    if (next === prev) continue
    r.status[m.key] = next
    const text = describe(m, value, next)
    if (isWorse(next, prev)) {
      pushAlert(r, next, `${m.label} ${text}`, fmtMetric(m, value))
    } else if (next === 'goed') {
      pushAlert(r, 'goed', `${m.label} weer in orde`, fmtMetric(m, value))
    }
  }

  if (!state.autoVent) return
  const v = r.value
  if (r.boost === 'uit' && (v.co2 > 1000 || v.tvoc > 800 || v.pm25 > 20)) {
    const cause = v.co2 > 1000 ? fmtMetric(METRIC.co2, v.co2) : v.tvoc > 800 ? fmtMetric(METRIC.tvoc, v.tvoc) : fmtMetric(METRIC.pm25, v.pm25)
    setBoost(r, 'automatisch', cause)
  } else if (r.boost === 'automatisch' && v.co2 < 750 && v.tvoc < 450 && v.pm25 < 13) {
    setBoost(r, 'uit', 'Automatisch · lucht weer fris')
  }
}

function measure(r: RoomState) {
  for (const m of METRICS) {
    const raw = r.value[m.key] + noise() * NOISE[m.key]
    const factor = 10 ** m.decimals
    r.reading[m.key] = Math.round(Math.max(0, raw) * factor) / factor
  }
}

function sample() {
  for (const r of state.rooms) {
    measure(r)
    const h = r.history
    h.t.push(state.time)
    for (const m of METRICS) h[m.key].push(r.reading[m.key])
    if (h.t.length > HISTORY_MINUTES) {
      h.t.shift()
      for (const m of METRICS) h[m.key].shift()
    }
  }
}

function advance(seconds: number) {
  let remaining = seconds
  while (remaining > 0) {
    const dt = Math.min(SUBSTEP, remaining)
    remaining -= dt
    state.time += dt * 1000
    const date = new Date(state.time)
    const outside = outdoorAt(date)
    state.outdoor = outside
    for (const r of state.rooms) {
      stepRoom(r, dt, date, outside)
      evaluate(r)
    }
    while (state.time >= nextSample) {
      sample()
      nextSample += 60_000
    }
  }
  for (const r of state.rooms) measure(r)
  state.lastUpdate = Date.now()
}

function reset() {
  const from = atTime(START.warmupFrom[0], START.warmupFrom[1])
  const outside = outdoorAt(new Date(from))
  state.time = from
  state.alerts = []
  state.rooms = ROOMS.map((d) => makeRoom(d, outside))
  nextSample = from
  const until = atTime(START.now[0], START.now[1])
  advance((until - from) / 1000)
}

function start() {
  if (timer) return
  timer = setInterval(() => {
    if (state.speed > 0) advance(state.speed)
  }, 1000)
}

function stop() {
  clearInterval(timer)
  timer = undefined
}

function toggleBoost(id: string) {
  const r = state.rooms.find((x) => x.id === id)
  if (!r) return
  setBoost(r, r.boost === 'uit' ? 'handmatig' : 'uit')
}

function setAutoVent(on: boolean) {
  state.autoVent = on
  if (!on) {
    for (const r of state.rooms) if (r.boost === 'automatisch') setBoost(r, 'uit', 'Automatisch ventileren uitgezet')
  } else {
    for (const r of state.rooms) evaluate(r)
  }
}

reset()

const overall = (r: RoomState): Status => worst(METRICS.map((m) => statusOf(m, r.reading[m.key])))

export function useAirSensors() {
  const scores = computed(() => Object.fromEntries(state.rooms.map((r) => [r.id, roomScore(r.reading)])) as Record<string, number>)
  const buildingScore = computed(() => {
    // Gemiddelde van alle ruimtes; de slechtste ruimte weegt extra mee
    const list = Object.values(scores.value)
    if (!list.length) return 0
    const avg = list.reduce((a, b) => a + b, 0) / list.length
    return 0.7 * avg + 0.3 * Math.min(...list)
  })
  const overallStatus = computed(() => Object.fromEntries(state.rooms.map((r) => [r.id, overall(r)])) as Record<string, Status>)
  const counts = computed(() => {
    const c: Record<Status, number> = { goed: 0, matig: 0, slecht: 0 }
    for (const s of Object.values(overallStatus.value)) c[s]++
    return c
  })
  const slot = computed(() => slotAt(new Date(state.time)).slot)

  return {
    state,
    scores,
    buildingScore,
    overallStatus,
    counts,
    slot,
    start,
    stop,
    reset,
    toggleBoost,
    setAutoVent,
  }
}
