export type Period = 'nacht' | 'inloop' | 'les' | 'pauze' | 'lunch' | 'uitloop'

export interface Slot {
  from: number
  to: number
  period: Period
  block?: number
}

const m = (h: number, min = 0) => h * 60 + min

/** Lesrooster van een gewone schooldag (minuten na middernacht) */
export const SCHEDULE: Slot[] = [
  { from: 0, to: m(7, 45), period: 'nacht' },
  { from: m(7, 45), to: m(8, 30), period: 'inloop' },
  { from: m(8, 30), to: m(10), period: 'les', block: 1 },
  { from: m(10), to: m(10, 15), period: 'pauze' },
  { from: m(10, 15), to: m(11, 45), period: 'les', block: 2 },
  { from: m(11, 45), to: m(12, 30), period: 'lunch' },
  { from: m(12, 30), to: m(14), period: 'les', block: 3 },
  { from: m(14), to: m(14, 15), period: 'pauze' },
  { from: m(14, 15), to: m(15, 45), period: 'les', block: 4 },
  { from: m(15, 45), to: m(17), period: 'uitloop' },
  { from: m(17), to: m(24), period: 'nacht' },
]

export function slotAt(date: Date): { slot: Slot; index: number } {
  const min = date.getHours() * 60 + date.getMinutes()
  const index = SCHEDULE.findIndex((s) => min >= s.from && min < s.to)
  return { slot: SCHEDULE[Math.max(0, index)], index: Math.max(0, index) }
}

export function slotLabel(slot: Slot): string {
  switch (slot.period) {
    case 'les':
      return `Lesblok ${slot.block}`
    case 'pauze':
      return 'Pauze'
    case 'lunch':
      return 'Middagpauze'
    case 'inloop':
      return 'Inloop'
    case 'uitloop':
      return 'Na schooltijd'
    default:
      return 'Gebouw gesloten'
  }
}

export interface RoomDef {
  id: string
  name: string
  kind: string
  area: number
  height: number
  capacity: number
  /** Luchtverversing in m³/u bij normale stand */
  ventilation: number
  /** Bezetting als fractie van de capaciteit per periode */
  profile: Partial<Record<Period, number>>
  /** Bezetting per lesblok (overschrijft profile.les) */
  blocks?: number[]
  heatGain: number
  tempBase: number
  rhBase: number
  pmIn: number
  pmAct: number
  tvocBase: number
  tvocAct: number
  /** Geplande activiteiten die extra uitstoot geven, per lesblok */
  events?: { block: number; tvoc?: number; pm25?: number }[]
  /** SVG-vorm op de plattegrond (viewBox 0 0 1000 880) */
  path: string
  label: [number, number]
  narrow?: boolean
}

export const ROOMS: RoomDef[] = [
  {
    id: 'bluebox',
    name: 'Blue Box',
    kind: 'Collegezaal',
    area: 265,
    height: 4.2,
    capacity: 120,
    ventilation: 1800,
    profile: { les: 0.9, pauze: 0.08, lunch: 0.05, inloop: 0.1, uitloop: 0.05 },
    blocks: [0.82, 0.95, 0.72, 0.1],
    heatGain: 3.6,
    tempBase: 21.2,
    rhBase: 45,
    pmIn: 0.45,
    pmAct: 6,
    tvocBase: 120,
    tvocAct: 260,
    path: 'M600 30 H830 V470 H525 V255 H600 Z',
    label: [700, 300],
  },
  {
    id: 'expertise',
    name: 'Expertise Centrum',
    kind: 'Praktijkruimtes',
    area: 331,
    height: 3.6,
    capacity: 60,
    ventilation: 2000,
    profile: { les: 0.75, pauze: 0.12, lunch: 0.15, inloop: 0.25, uitloop: 0.2 },
    heatGain: 1.8,
    tempBase: 20.8,
    rhBase: 44,
    pmIn: 0.5,
    pmAct: 16,
    tvocBase: 220,
    tvocAct: 520,
    events: [{ block: 2, tvoc: 650, pm25: 6 }],
    path: 'M155 30 H345 V510 H155 Z',
    label: [250, 270],
  },
  {
    id: 'atrium',
    name: 'Atrium',
    kind: 'Centrale hal',
    area: 540,
    height: 9,
    capacity: 160,
    ventilation: 5200,
    profile: { les: 0.12, pauze: 0.75, lunch: 0.9, inloop: 0.45, uitloop: 0.35 },
    heatGain: 1.2,
    tempBase: 20.4,
    rhBase: 46,
    pmIn: 0.6,
    pmAct: 5,
    tvocBase: 90,
    tvocAct: 120,
    path: 'M345 145 H525 V30 H600 V255 H525 V470 H830 V510 H345 Z',
    label: [435, 330],
  },
  {
    id: 'expo',
    name: 'Expo Hoek',
    kind: 'Studielandschap',
    area: 96,
    height: 3.6,
    capacity: 20,
    ventilation: 520,
    profile: { les: 0.5, pauze: 0.35, lunch: 0.6, inloop: 0.2, uitloop: 0.2 },
    heatGain: 1.5,
    tempBase: 21,
    rhBase: 45,
    pmIn: 0.5,
    pmAct: 4,
    tvocBase: 140,
    tvocAct: 150,
    path: 'M40 30 H155 V510 H40 Z',
    label: [97, 270],
    narrow: true,
  },
  {
    id: 'studie',
    name: 'Studielandschap',
    kind: 'Stille werkplekken · B4.01',
    area: 104,
    height: 3.2,
    capacity: 40,
    ventilation: 780,
    profile: { les: 0.72, pauze: 0.45, lunch: 0.55, inloop: 0.3, uitloop: 0.25 },
    heatGain: 2.2,
    tempBase: 21.4,
    rhBase: 46,
    pmIn: 0.45,
    pmAct: 4,
    tvocBase: 150,
    tvocAct: 200,
    path: 'M40 510 H300 V640 H40 Z',
    label: [170, 585],
  },
  {
    id: 'binnenkomst',
    name: 'Binnenkomst',
    kind: 'Entree en hal',
    area: 985,
    height: 4,
    capacity: 220,
    ventilation: 7000,
    profile: { les: 0.06, pauze: 0.3, lunch: 0.35, inloop: 0.9, uitloop: 0.7 },
    heatGain: 0.8,
    tempBase: 20.2,
    rhBase: 50,
    pmIn: 0.9,
    pmAct: 8,
    tvocBase: 80,
    tvocAct: 60,
    path: 'M40 640 H300 V510 H830 V660 H700 V860 H330 L40 690 Z',
    label: [450, 755],
  },
  {
    id: 'balie',
    name: 'Balie',
    kind: 'Ontvangst en informatie',
    area: 34,
    height: 3,
    capacity: 4,
    ventilation: 220,
    profile: { les: 0.75, pauze: 0.75, lunch: 0.5, inloop: 0.75, uitloop: 0.75 },
    heatGain: 1.2,
    tempBase: 21.6,
    rhBase: 44,
    pmIn: 0.8,
    pmAct: 3,
    tvocBase: 180,
    tvocAct: 60,
    path: 'M700 660 H830 V860 H700 Z',
    label: [765, 765],
    narrow: true,
  },
  {
    id: 'docenten',
    name: 'Docentenhoek',
    kind: 'Docentenkamer',
    area: 58,
    height: 3,
    capacity: 16,
    ventilation: 340,
    profile: { les: 0.3, pauze: 0.9, lunch: 0.85, inloop: 0.65, uitloop: 0.5 },
    heatGain: 2,
    tempBase: 21.8,
    rhBase: 44,
    pmIn: 0.45,
    pmAct: 3,
    tvocBase: 160,
    tvocAct: 140,
    path: 'M830 680 H980 V860 H830 Z',
    label: [905, 775],
  },
]

/** Niet-gemeten delen van de plattegrond */
export const OTHER_AREAS = [
  { id: 'sanitair', name: 'Toiletten', path: 'M345 30 H525 V145 H345 Z', label: [435, 92] as [number, number] },
  { id: 'garderobe', name: 'Garderobe · trap', path: 'M560 545 H800 V630 H560 Z', label: [680, 592] as [number, number] },
  { id: 'overig', name: 'A1.31', path: 'M830 30 H980 V150 H830 Z', label: [905, 95] as [number, number] },
]

export const COURTYARD = { path: 'M830 150 H980 V660 H830 Z', label: [905, 400] as [number, number] }
