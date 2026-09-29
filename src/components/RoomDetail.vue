<script setup lang="ts">
import { computed } from 'vue'
import AnimatedNumber from './AnimatedNumber.vue'
import Icon from './Icon.vue'
import StatusPill from './StatusPill.vue'
import TrendChart from './TrendChart.vue'
import { METRIC, METRICS, describe, fmt, isLow, statusOf, thresholdText, type MetricKey, type Status } from '../sim/metrics'
import { TREND_LABEL, trendOf } from '../sim/format'
import type { RoomState } from '../sim/useAirSensors'

const props = defineProps<{
  room: RoomState
  metric: MetricKey
  status: Status
  score: number
  autoVent: boolean
  now: number
}>()
const emit = defineEmits<{ 'update:metric': [key: MetricKey]; toggleBoost: [id: string] }>()

const def = computed(() => props.room.def)
const metricDef = computed(() => METRIC[props.metric])
const limits = computed(() => thresholdText(metricDef.value))

const tiles = computed(() =>
  METRICS.map((m) => {
    const v = props.room.reading[m.key]
    const status = statusOf(m, v)
    return { m, v, status, text: describe(m, v, status), trend: trendOf(props.room, m.key) }
  }),
)

const chart = computed(() => {
  const h = props.room.history
  return {
    times: [...h.t, props.now],
    values: [...h[props.metric], props.room.reading[props.metric]],
  }
})

const occupancy = computed(() => Math.round(props.room.occupancy))
const occupancyPct = computed(() => Math.min(100, (props.room.occupancy / def.value.capacity) * 100))

const RANK: Record<Status, number> = { goed: 0, matig: 1, slecht: 2 }
const advice = computed(() => {
  const issues = tiles.value
    .filter((t) => t.status !== 'goed')
    .sort((a, b) => RANK[b.status] - RANK[a.status] || b.m.weight - a.m.weight)
  if (!issues.length) {
    return {
      status: 'goed' as Status,
      title: 'Alles in orde',
      text: `De lucht in ${def.value.name} is fris. Er is geen actie nodig.`,
      extra: '',
    }
  }
  const [main, ...rest] = issues
  const low = isLow(main.m, main.v)
  return {
    status: main.status,
    title: `${main.m.label} ${main.text}`,
    text: (low && main.m.adviceLow) || main.m.adviceHigh,
    extra: rest.length ? `Let ook op: ${rest.map((t) => `${t.m.label.toLowerCase()} ${t.text}`).join(', ')}.` : '',
  }
})

const boostOn = computed(() => props.room.boost !== 'uit')
const lockedByAuto = computed(() => props.autoVent && props.room.boost === 'automatisch')
const ventText = computed(() => {
  const base = def.value.ventilation
  if (props.room.boost === 'automatisch') return `Automatisch aan · ${fmt(base * 3)} m³/u`
  if (props.room.boost === 'handmatig') return `Aan · ${fmt(base * 3)} m³/u`
  return `Normale stand · ${fmt(base)} m³/u`
})
</script>

<template>
  <section class="detail tile" :aria-label="`Details ${def.name}`">
    <header class="head">
      <div>
        <p class="kind">{{ def.kind }} · {{ def.area }} m²</p>
        <h3>{{ def.name }}</h3>
      </div>
      <StatusPill :status="status" />
    </header>

    <div class="occupancy">
      <Icon name="people" class="occ-icon" />
      <div class="occ-body">
        <div class="occ-text">
          <span>Bezetting (geschat)</span>
          <strong class="num">{{ occupancy }} van {{ def.capacity }}</strong>
        </div>
        <div class="occ-bar" role="presentation"><i :style="{ width: `${occupancyPct}%` }"></i></div>
      </div>
    </div>

    <div class="metrics">
      <button
        v-for="t in tiles"
        :key="t.m.key"
        type="button"
        class="metric"
        :class="{ active: t.m.key === metric }"
        :data-status="t.status"
        :aria-pressed="t.m.key === metric"
        @click="emit('update:metric', t.m.key)"
      >
        <span class="m-label"><Icon :name="t.m.key" />{{ t.m.label }}</span>
        <span class="m-value">
          <AnimatedNumber :value="t.v" :decimals="t.m.decimals" />
          <small>{{ t.m.unit }}</small>
        </span>
        <span class="m-meta">
          <i class="dot" aria-hidden="true"></i>
          <span class="m-state">{{ t.text }}</span>
          <span class="trend" :data-trend="t.trend">
            <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6h8M7 3l3 3-3 3" /></svg>
            {{ TREND_LABEL[t.trend] }}
          </span>
        </span>
      </button>
    </div>

    <div class="chart-block">
      <div class="chart-head">
        <h4>{{ metricDef.label }} <span>afgelopen 4 uur</span></h4>
        <ul class="legend" aria-label="Grenswaarden">
          <li data-status="goed"><i></i>{{ limits.goed }}</li>
          <li data-status="slecht"><i></i>{{ limits.slecht }}</li>
        </ul>
      </div>
      <TrendChart :times="chart.times" :values="chart.values" :def="metricDef" />
      <p class="guideline">{{ metricDef.guideline }} {{ metricDef.why }}</p>
    </div>

    <div class="group">
      <div class="row advice" :data-status="advice.status">
        <span class="badge"><Icon :name="advice.status === 'goed' ? 'check' : 'alert'" /></span>
        <div class="row-body">
          <strong>{{ advice.title }}</strong>
          <p>{{ advice.text }}</p>
          <p v-if="advice.extra" class="extra">{{ advice.extra }}</p>
        </div>
      </div>
      <div class="row vent">
        <span class="badge vent-badge" :class="{ on: boostOn }"><Icon name="wind" /></span>
        <div class="row-body">
          <strong id="vent-label">Ventilatie verhogen</strong>
          <p>{{ lockedByAuto ? 'Wordt automatisch geregeld' : ventText }}</p>
        </div>
        <button
          id="vent-switch"
          type="button"
          class="switch"
          role="switch"
          :aria-checked="boostOn"
          aria-labelledby="vent-label"
          :disabled="lockedByAuto"
          @click="emit('toggleBoost', room.id)"
        >
          <i></i>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.detail {
  container-type: inline-size;
  display: grid;
  gap: 22px;
  padding: 28px;
}
.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.kind {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-3);
}
h3 {
  font-size: clamp(28px, 3.4vw, 40px);
  font-weight: 700;
  letter-spacing: -0.015em;
  line-height: 1.1;
}

.occupancy {
  display: flex;
  align-items: center;
  gap: 12px;
}
.occ-icon {
  font-size: 22px;
  color: var(--ink-3);
}
.occ-body {
  flex: 1;
  display: grid;
  gap: 6px;
}
.occ-text {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: var(--ink-2);
}
.occ-text strong {
  color: var(--ink);
  font-weight: 600;
}
.occ-bar {
  height: 6px;
  border-radius: 99px;
  background: var(--fill-2);
  overflow: hidden;
}
.occ-bar i {
  display: block;
  height: 100%;
  background: var(--ink);
  border-radius: inherit;
  transition: width 0.8s ease;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.metric {
  display: grid;
  gap: 6px;
  align-content: start;
  text-align: left;
  padding: 14px 16px;
  border: 0;
  border-radius: var(--r-m);
  background: var(--fill);
  cursor: pointer;
  transition:
    box-shadow 0.2s,
    background-color 0.2s,
    transform 0.2s;
}
.metric:first-child {
  grid-column: span 2;
}
.metric:hover {
  transform: scale(1.02);
}
.metric.active {
  background: var(--surface);
  box-shadow: inset 0 0 0 2px var(--accent);
}
.m-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-2);
}
.m-label .icon {
  font-size: 15px;
}
.m-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-size: 26px;
  font-weight: 700;
  line-height: 1.1;
}
.metric:first-child .m-value {
  font-size: 42px;
}
.m-value small {
  font-family: var(--font-ui);
  font-size: 14px;
  font-weight: 500;
  color: var(--ink-3);
  letter-spacing: -0.01em;
}
.m-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 6px;
  font-size: 13px;
  color: var(--ink-2);
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--st-dot);
  flex: none;
}
.m-state {
  color: var(--st);
  font-weight: 600;
}
.trend {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: var(--ink-3);
}
.trend svg {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform 0.3s;
}
.trend[data-trend='1'] svg {
  transform: rotate(-45deg);
}
.trend[data-trend='-1'] svg {
  transform: rotate(45deg);
}

.chart-block {
  display: grid;
  gap: 12px;
}
.chart-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px 16px;
}
h4 {
  margin: 0;
  font-size: 21px;
  font-weight: 700;
  letter-spacing: 0.01em;
}
h4 span {
  font-size: 15px;
  font-weight: 500;
  color: var(--ink-3);
  margin-left: 4px;
  letter-spacing: -0.02em;
}
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 13px;
  color: var(--ink-2);
}
.legend li {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.legend i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--st-dot);
}
.guideline {
  font-size: 14px;
  line-height: 1.43;
  color: var(--ink-2);
  max-width: 65ch;
}

/* Gegroepeerde lijst, zoals Instellingen */
.group {
  display: grid;
  border-radius: var(--r-m);
  background: var(--fill);
  overflow: hidden;
}
.row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  position: relative;
}
.row + .row::before {
  content: '';
  position: absolute;
  top: 0;
  left: 60px;
  right: 0;
  border-top: 1px solid var(--line);
}
.advice {
  align-items: start;
}
.badge {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--st-dot);
  color: #fff;
  font-size: 18px;
}
.badge .icon {
  stroke-width: 2.6;
}
.vent-badge {
  background: var(--ink-3);
  transition: background-color 0.3s;
}
.vent-badge .icon {
  stroke-width: 2.2;
}
.vent-badge.on {
  background: var(--accent);
}
.row-body strong {
  display: block;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.3;
}
.advice .row-body strong {
  color: var(--st);
}
.row-body p {
  font-size: 14px;
  line-height: 1.43;
  color: var(--ink-2);
  margin-top: 2px;
}
.advice .row-body p:first-of-type {
  color: var(--ink);
}
.row-body .extra {
  font-size: 13px;
}

@media (max-width: 734px) {
  .detail {
    padding: 22px 18px;
  }
}
</style>
