<script setup lang="ts">
import { computed } from 'vue'
import AnimatedNumber from './AnimatedNumber.vue'
import Icon from './Icon.vue'
import { METRICS, describe, fmt, fmtMetric, scoreOf, statusOf, type Readings, type Status } from '../sim/metrics'
import type { RoomState } from '../sim/useAirSensors'

const props = defineProps<{
  rooms: RoomState[]
  score: number
  scores: Record<string, number>
  statuses: Record<string, Status>
  counts: Record<Status, number>
  outdoor: Readings
}>()
const emit = defineEmits<{ select: [id: string] }>()

const scoreStatus = computed<Status>(() => (props.score >= 85 ? 'goed' : props.score >= 65 ? 'matig' : 'slecht'))
const scoreLabel = computed(
  () => ({ goed: 'Gezond binnenklimaat', matig: 'Kan beter', slecht: 'Onvoldoende' })[scoreStatus.value],
)

const R = 78
const C = 2 * Math.PI * R
const ringOffset = computed(() => C * (1 - Math.min(100, Math.max(0, props.score)) / 100))

const RANK: Record<Status, number> = { goed: 0, matig: 1, slecht: 2 }
const segments = computed(() =>
  [...props.rooms]
    .sort((a, b) => RANK[props.statuses[b.id]] - RANK[props.statuses[a.id]])
    .map((r) => ({ id: r.id, name: r.def.name, status: props.statuses[r.id] })),
)

const attention = computed(() =>
  props.rooms
    .filter((r) => props.statuses[r.id] !== 'goed')
    .sort((a, b) => props.scores[a.id] - props.scores[b.id])
    .slice(0, 3)
    .map((r) => {
      const m = [...METRICS].sort((a, b) => scoreOf(a, r.reading[a.key]) - scoreOf(b, r.reading[b.key]))[0]
      const v = r.reading[m.key]
      const st = statusOf(m, v)
      return { id: r.id, name: r.def.name, status: st, issue: `${m.label} ${describe(m, v, st)}`, value: fmtMetric(m, v) }
    }),
)
</script>

<template>
  <div class="bento">
    <section class="tile score" :data-status="scoreStatus" aria-labelledby="score-title">
      <h3 id="score-title" class="tile-title">Gebouwscore</h3>
      <div class="ring-wrap">
        <svg class="ring" viewBox="0 0 200 200" role="img" :aria-label="`Gebouwscore ${Math.round(score)} van 100`">
          <defs>
            <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" style="stop-color: var(--st-grad)" />
              <stop offset="1" style="stop-color: var(--st-dot)" />
            </linearGradient>
          </defs>
          <circle class="track" cx="100" cy="100" :r="R" />
          <circle
            class="progress"
            cx="100"
            cy="100"
            :r="R"
            :stroke-dasharray="C"
            :stroke-dashoffset="ringOffset"
            transform="rotate(-90 100 100)"
          />
        </svg>
        <div class="ring-center">
          <AnimatedNumber class="ring-num" :value="Math.round(score)" />
          <span class="ring-of">van 100</span>
        </div>
      </div>
      <p class="score-label">{{ scoreLabel }}</p>
    </section>

    <section class="tile attention" aria-labelledby="attention-title">
      <h3 id="attention-title" class="tile-title">Aandacht nodig</h3>
      <ul v-if="attention.length">
        <li v-for="a in attention" :key="a.id" :data-status="a.status">
          <button type="button" @click="emit('select', a.id)">
            <span class="badge"><Icon name="alert" /></span>
            <span class="a-text">
              <strong>{{ a.name }}</strong>
              <span>{{ a.issue }}</span>
            </span>
            <span class="num a-value">{{ a.value }}</span>
            <Icon name="chevron" class="a-chev" />
          </button>
        </li>
      </ul>
      <p v-else class="all-good" data-status="goed">
        <span class="badge"><Icon name="check" /></span>
        Alle ruimtes zijn in orde.
      </p>
    </section>

    <section class="tile rooms" aria-labelledby="rooms-now-title">
      <h3 id="rooms-now-title" class="tile-title">Ruimtes nu</h3>
      <p class="big-line">
        <span class="num" data-status="goed">{{ counts.goed }}</span>
        <span class="of">van {{ rooms.length }} in orde</span>
      </p>
      <div class="stack" role="list" aria-label="Status per ruimte">
        <button
          v-for="s in segments"
          :key="s.id"
          type="button"
          role="listitem"
          :data-status="s.status"
          :title="`${s.name}: ${s.status}`"
          :aria-label="`${s.name}: ${s.status}`"
          @click="emit('select', s.id)"
        ></button>
      </div>
      <ul class="counts">
        <li data-status="goed"><i></i>{{ counts.goed }} goed</li>
        <li data-status="matig"><i></i>{{ counts.matig }} matig</li>
        <li data-status="slecht"><i></i>{{ counts.slecht }} slecht</li>
      </ul>
    </section>

    <section class="tile outside" aria-labelledby="outside-title">
      <h3 id="outside-title" class="tile-title"><Icon name="sun" /> Buiten</h3>
      <p class="big-line">
        <span class="num">{{ fmt(outdoor.temp, 1) }}°</span>
      </p>
      <dl>
        <div>
          <dt>Vocht</dt>
          <dd class="num">{{ fmt(outdoor.rh) }}%</dd>
        </div>
        <div>
          <dt>CO₂</dt>
          <dd class="num">{{ fmt(outdoor.co2) }}</dd>
        </div>
        <div>
          <dt>PM2.5</dt>
          <dd class="num">{{ fmt(outdoor.pm25) }}</dd>
        </div>
      </dl>
    </section>
  </div>
</template>

<style scoped>
.bento {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 16px;
}
.tile {
  display: grid;
  align-content: start;
  gap: 14px;
  padding: 26px 28px;
  min-width: 0;
}
.tile-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 17px;
  font-weight: 600;
  color: var(--ink-2);
  letter-spacing: -0.022em;
}

/* Score met ring */
.score {
  grid-column: 1 / span 4;
  grid-row: span 2;
  justify-items: center;
  align-content: space-between;
  text-align: center;
}
.score .tile-title {
  justify-self: start;
}
.ring-wrap {
  position: relative;
  width: min(100%, 230px);
  aspect-ratio: 1;
}
.ring {
  width: 100%;
  height: 100%;
}
.track {
  fill: none;
  stroke: var(--st-fill);
  stroke-width: 22;
}
.progress {
  fill: none;
  stroke: url(#ring-grad);
  stroke-width: 22;
  stroke-linecap: round;
  transition: stroke-dashoffset 1s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.ring-center {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
}
.ring-num {
  font-size: 64px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.03em;
}
.ring-of {
  margin-top: 4px;
  font-size: 14px;
  color: var(--ink-3);
}
.score-label {
  font-size: 21px;
  font-weight: 600;
  color: var(--st);
  letter-spacing: 0.01em;
}

/* Aandacht nodig */
.attention {
  grid-column: 5 / span 8;
}
.attention ul {
  display: grid;
  margin: 0 -12px;
  padding: 0;
  list-style: none;
}
.attention li {
  position: relative;
}
.attention li + li::before {
  content: '';
  position: absolute;
  top: 0;
  left: 56px;
  right: 12px;
  border-top: 1px solid var(--line);
}
.attention button {
  all: unset;
  box-sizing: border-box;
  width: 100%;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 14px;
  padding: 11px 12px;
  border-radius: 14px;
  cursor: pointer;
  transition: background-color 0.15s;
}
.attention button:hover {
  background: var(--fill);
}
.attention button:focus-visible {
  outline: 2px solid var(--accent);
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
.a-text {
  display: grid;
  min-width: 0;
  line-height: 1.3;
}
.a-text strong {
  font-size: 17px;
  font-weight: 600;
}
.a-text span {
  font-size: 14px;
  color: var(--ink-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.a-value {
  font-size: 17px;
  font-weight: 600;
  color: var(--st);
}
.a-chev {
  color: var(--ink-3);
  font-size: 16px;
}
.all-good {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 17px;
  font-weight: 600;
}

/* Ruimtes nu */
.rooms {
  grid-column: 5 / span 4;
}
.big-line {
  display: flex;
  align-items: baseline;
  gap: 8px;
  line-height: 1;
}
.big-line .num {
  font-size: 48px;
  font-weight: 700;
  letter-spacing: -0.03em;
}
.big-line .num[data-status] {
  color: var(--st);
}
.big-line .of {
  font-size: 17px;
  color: var(--ink-2);
}
.stack {
  display: flex;
  gap: 4px;
  height: 10px;
}
.stack button {
  flex: 1;
  min-width: 0;
  border: 0;
  padding: 0;
  border-radius: 99px;
  background: var(--st-dot);
  cursor: pointer;
  transition:
    background-color 0.5s,
    transform 0.2s;
}
.stack button:hover {
  transform: scaleY(1.5);
}
.counts {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 14px;
  color: var(--ink-2);
}
.counts li {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.counts i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--st-dot);
}

/* Buiten */
.outside {
  grid-column: 9 / span 4;
}
.outside .tile-title .icon {
  color: var(--matig-dot);
  font-size: 19px;
}
.outside dl {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
}
dt {
  font-size: 13px;
  color: var(--ink-3);
}
dd {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
}

@media (max-width: 1068px) {
  .score {
    grid-column: 1 / span 5;
  }
  .attention {
    grid-column: 6 / span 7;
  }
  .rooms {
    grid-column: 6 / span 7;
  }
  .outside {
    grid-column: 1 / span 12;
    grid-template-columns: auto auto minmax(0, 1fr);
    align-items: center;
    gap: 24px;
  }
  .score {
    grid-row: span 2;
  }
}
@media (max-width: 734px) {
  .bento {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }
  .score,
  .attention,
  .rooms,
  .outside {
    grid-column: 1 / -1;
    grid-row: auto;
  }
  .outside {
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
  }
  .tile {
    padding: 22px 20px;
  }
  .ring-wrap {
    width: 200px;
  }
}
</style>
