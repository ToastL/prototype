<script setup lang="ts">
import { computed, ref } from 'vue'
import { useElementWidth } from '../composables/useElementWidth'
import { fmt, fmtMetric, statusOf, type MetricDef, type Status } from '../sim/metrics'
import { fmtTime } from '../sim/format'

const props = defineProps<{ times: number[]; values: number[]; def: MetricDef }>()

const el = ref<HTMLElement | null>(null)
const width = useElementWidth(el)
const hover = ref<number | null>(null)
const gradientId = `trend-${Math.random().toString(36).slice(2, 8)}`

const H = 240
const PAD = { l: 4, r: 50, t: 14, b: 30 }

function niceStep(range: number, count: number) {
  const raw = range / count
  const pow = 10 ** Math.floor(Math.log10(raw))
  const n = raw / pow
  return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * pow
}

const geo = computed(() => {
  const w = width.value
  const { times, values, def } = props
  if (!w || values.length < 2) return null

  const iw = w - PAD.l - PAD.r
  const ih = H - PAD.t - PAD.b
  const margin = (def.chart[1] - def.chart[0]) * 0.03
  let lo = Math.min(def.chart[0], Math.min(...values))
  let hi = Math.max(def.chart[1], Math.max(...values) + margin)
  const step = niceStep(hi - lo, 4)
  lo = Math.max(0, Math.floor(lo / step) * step)
  hi = Math.ceil(hi / step) * step

  const t0 = times[0]
  const t1 = times[times.length - 1]
  const x = (t: number) => PAD.l + ((t - t0) / Math.max(1, t1 - t0)) * iw
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * ih

  const zones: { status: Status; y: number; h: number }[] = []
  const zone = (status: Status, a: number, b: number) => {
    const from = Math.max(lo, a)
    const to = Math.min(hi, b)
    if (to > from) zones.push({ status, y: y(to), h: y(from) - y(to) })
  }
  zone('slecht', -Infinity, def.ok[0])
  zone('matig', def.ok[0], def.good[0])
  zone('goed', def.good[0], def.good[1])
  zone('matig', def.good[1], def.ok[1])
  zone('slecht', def.ok[1], Infinity)

  const thresholds = [def.ok[0], def.good[0], def.good[1], def.ok[1]].filter((v) => v > lo && v < hi)

  const yTicks: number[] = []
  for (let v = lo; v <= hi + step / 1000; v += step) yTicks.push(+v.toFixed(6))

  const hourMs = 3_600_000
  const every = iw / ((t1 - t0) / hourMs) > 140 ? hourMs / 2 : hourMs
  const xTicks: number[] = []
  for (let t = Math.ceil(t0 / every) * every; t <= t1; t += every) {
    if (x(t) > PAD.l + 16 && x(t) < w - PAD.r - 16) xTicks.push(t)
  }

  const xs = times.map(x)
  const ys = values.map(y)
  const line = `M${xs.map((px, i) => `${px.toFixed(1)},${ys[i].toFixed(1)}`).join('L')}`
  const bottom = PAD.t + ih

  return {
    w,
    iw,
    bottom,
    zones,
    thresholds: thresholds.map(y),
    yTicks: yTicks.map((v) => ({ v, y: y(v) })),
    xTicks: xTicks.map((t) => ({ t, x: x(t) })),
    xs,
    ys,
    line,
    area: `${line}L${xs[xs.length - 1].toFixed(1)},${bottom}L${xs[0].toFixed(1)},${bottom}Z`,
  }
})

const lastStatus = computed(() => statusOf(props.def, props.values[props.values.length - 1] ?? 0))

function onMove(e: PointerEvent) {
  const g = geo.value
  if (!g) return
  const rect = (e.currentTarget as Element).getBoundingClientRect()
  const px = e.clientX - rect.left
  if (px > g.w - PAD.r + 8) {
    hover.value = null
    return
  }
  let best = 0
  for (let i = 1; i < g.xs.length; i++) if (Math.abs(g.xs[i] - px) < Math.abs(g.xs[best] - px)) best = i
  hover.value = best
}

const tip = computed(() => {
  const g = geo.value
  const i = hover.value
  if (!g || i === null || i >= g.xs.length) return null
  const v = props.values[i]
  return {
    x: g.xs[i],
    y: g.ys[i],
    time: fmtTime(props.times[i]),
    value: fmtMetric(props.def, v),
    status: statusOf(props.def, v),
    alignRight: g.xs[i] > g.w - PAD.r - 60,
    alignLeft: g.xs[i] < 70,
  }
})

const label = computed(() => {
  const t = props.times
  const v = props.values
  if (t.length < 2) return props.def.label
  return `${props.def.label} van ${fmtTime(t[0])} tot ${fmtTime(t[t.length - 1])}, nu ${fmtMetric(props.def, v[v.length - 1])}`
})
</script>

<template>
  <div ref="el" class="chart" :style="{ height: `${H}px` }">
    <svg
      v-if="geo"
      :width="geo.w"
      :height="H"
      role="img"
      :aria-label="label"
      @pointermove="onMove"
      @pointerleave="hover = null"
    >
      <defs>
        <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style="stop-color: var(--accent); stop-opacity: 0.24" />
          <stop offset="1" style="stop-color: var(--accent); stop-opacity: 0" />
        </linearGradient>
      </defs>

      <rect
        v-for="(z, i) in geo.zones"
        :key="`z${i}`"
        class="zone"
        :data-status="z.status"
        :x="PAD.l"
        :y="z.y"
        :width="geo.iw"
        :height="z.h"
      />

      <g class="grid">
        <g v-for="t in geo.yTicks" :key="`y${t.v}`">
          <line :x1="PAD.l" :x2="PAD.l + geo.iw" :y1="t.y" :y2="t.y" />
          <text :x="PAD.l + geo.iw + 10" :y="t.y" dy="0.34em" text-anchor="start">{{ fmt(t.v, def.decimals && t.v % 1 ? 1 : 0) }}</text>
        </g>
        <g v-for="t in geo.xTicks" :key="`x${t.t}`">
          <line class="tick" :x1="t.x" :x2="t.x" :y1="geo.bottom" :y2="geo.bottom + 5" />
          <text :x="t.x" :y="geo.bottom + 20" text-anchor="middle">{{ fmtTime(t.t) }}</text>
        </g>
      </g>

      <line
        v-for="(ty, i) in geo.thresholds"
        :key="`t${i}`"
        class="threshold"
        :x1="PAD.l"
        :x2="PAD.l + geo.iw"
        :y1="ty"
        :y2="ty"
      />

      <path class="area" :d="geo.area" :fill="`url(#${gradientId})`" />
      <path class="line" :d="geo.line" />

      <g class="now" :data-status="lastStatus">
        <circle class="halo" :cx="geo.xs[geo.xs.length - 1]" :cy="geo.ys[geo.ys.length - 1]" r="9" />
        <circle class="dot" :cx="geo.xs[geo.xs.length - 1]" :cy="geo.ys[geo.ys.length - 1]" r="4.5" />
      </g>

      <g v-if="tip" class="hover">
        <line :x1="tip.x" :x2="tip.x" :y1="PAD.t" :y2="geo.bottom" />
        <circle :cx="tip.x" :cy="tip.y" r="4" />
      </g>
    </svg>

    <div
      v-if="tip"
      class="tip"
      :class="{ right: tip.alignRight, left: tip.alignLeft }"
      :style="{ left: `${tip.x}px`, top: `${tip.y}px` }"
      :data-status="tip.status"
    >
      <span>{{ tip.time }}</span>
      <strong class="num">{{ tip.value }}</strong>
    </div>
  </div>
</template>

<style scoped>
.chart {
  position: relative;
  width: 100%;
  min-width: 0;
  touch-action: pan-y;
}
svg {
  display: block;
  overflow: visible;
}
.zone {
  fill: var(--st-fill);
  opacity: 0.55;
}
.grid line {
  stroke: var(--line);
  stroke-width: 1;
}
.grid .tick {
  stroke: var(--line-strong);
}
.grid text {
  fill: var(--ink-3);
  font-family: var(--font-num);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.threshold {
  stroke: var(--line-strong);
  stroke-dasharray: 3 4;
}
.line {
  fill: none;
  stroke: var(--accent);
  stroke-width: 2.5;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.now .halo {
  fill: var(--st-dot);
  opacity: 0.18;
  transform-box: fill-box;
  transform-origin: center;
  animation: halo 2s ease-out infinite;
}
.now .dot {
  fill: var(--surface);
  stroke: var(--st-dot);
  stroke-width: 3;
}
.hover line {
  stroke: var(--ink-2);
  stroke-width: 1;
  stroke-dasharray: 2 3;
}
.hover circle {
  fill: var(--accent);
  stroke: var(--surface);
  stroke-width: 2;
}
.tip {
  position: absolute;
  transform: translate(-50%, calc(-100% - 14px));
  display: grid;
  gap: 1px;
  padding: 7px 12px;
  border-radius: 12px;
  background: var(--surface);
  color: var(--ink);
  border: 1px solid var(--line);
  font-size: 12px;
  line-height: 1.3;
  white-space: nowrap;
  pointer-events: none;
  box-shadow: var(--shadow-hover);
}
.tip.right {
  transform: translate(calc(-100% + 12px), calc(-100% - 14px));
}
.tip.left {
  transform: translate(-12px, calc(-100% - 14px));
}
.tip span {
  color: var(--ink-2);
}
.tip strong {
  font-size: 15px;
  color: var(--st);
  font-weight: 600;
}
@keyframes halo {
  from {
    transform: scale(0.6);
    opacity: 0.35;
  }
  to {
    transform: scale(1.8);
    opacity: 0;
  }
}
</style>
