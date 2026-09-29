<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import AlertFeed from './components/AlertFeed.vue'
import FloorPlan from './components/FloorPlan.vue'
import Icon from './components/Icon.vue'
import RoomCard from './components/RoomCard.vue'
import RoomDetail from './components/RoomDetail.vue'
import SummaryBar from './components/SummaryBar.vue'
import { METRIC, METRICS, STATUS_LABEL, thresholdText, type MetricKey } from './sim/metrics'
import { fmtDay, fmtTime } from './sim/format'
import { slotLabel } from './sim/rooms'
import { SPEEDS, useAirSensors } from './sim/useAirSensors'

const { state, scores, buildingScore, overallStatus, counts, slot, start, stop, reset, toggleBoost, setAutoVent } =
  useAirSensors()

const metric = ref<MetricKey>('co2')
const selectedId = ref('bluebox')
const sortBy = ref<'aandacht' | 'naam' | 'plattegrond'>('aandacht')
const detailEl = ref<HTMLElement | null>(null)

const SORTS = [
  { value: 'aandacht', label: 'Aandacht', sub: 'Wat aandacht nodig heeft, staat bovenaan.' },
  { value: 'naam', label: 'A–Z', sub: 'Op alfabetische volgorde.' },
  { value: 'plattegrond', label: 'Plattegrond', sub: 'In de volgorde van de plattegrond.' },
] as const

const selectedRoom = computed(() => state.rooms.find((r) => r.id === selectedId.value) ?? state.rooms[0])
const metricDef = computed(() => METRIC[metric.value])
const limits = computed(() => thresholdText(metricDef.value))
const paused = computed(() => state.speed === 0)
const sortSub = computed(() => SORTS.find((s) => s.value === sortBy.value)?.sub ?? '')

const sortedRooms = computed(() => {
  const list = [...state.rooms]
  if (sortBy.value === 'naam') return list.sort((a, b) => a.def.name.localeCompare(b.def.name, 'nl'))
  if (sortBy.value === 'aandacht') return list.sort((a, b) => scores.value[a.id] - scores.value[b.id])
  return list
})

function select(id: string, reveal = false) {
  selectedId.value = id
  if (!reveal) return
  nextTick(() => {
    const el = detailEl.value
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.top < 60 || rect.top > window.innerHeight * 0.6) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

onMounted(start)
onBeforeUnmount(stop)
</script>

<template>
  <nav class="globalnav" aria-label="Hoofdnavigatie">
    <div class="nav-inner">
      <a class="nav-brand" href="#overzicht">
        <svg class="logo" viewBox="0 0 32 32" aria-hidden="true">
          <rect width="32" height="32" rx="9" />
          <path d="M7 12h12a3.5 3.5 0 1 0-3.5-3.5M7 17h17a3.5 3.5 0 1 1-3.5 3.5M7 22h8" />
        </svg>
        Luchtmonitor
      </a>
      <ul class="nav-links">
        <li><a href="#overzicht">Overzicht</a></li>
        <li><a href="#plattegrond">Plattegrond</a></li>
        <li><a href="#ruimtes">Ruimtes</a></li>
        <li><a href="#uitleg">Uitleg</a></li>
      </ul>
      <span class="nav-live" :class="{ paused }">
        <i aria-hidden="true"></i>
        {{ paused ? 'Gepauzeerd' : 'Live' }}
        <b class="num">{{ fmtTime(state.time) }}</b>
      </span>
    </div>
  </nav>

  <main class="page">
    <section id="overzicht" class="hero">
      <p class="eyebrow">{{ fmtDay(state.time) }} · {{ slotLabel(slot) }} · Hoofdgebouw</p>
      <h1>Frisse lucht. <span class="grad">Heldere koppen.</span></h1>
      <p class="hero-sub">
        {{ state.rooms.length }} sensoren meten elke minuut CO₂, temperatuur, luchtvochtigheid, fijnstof en vluchtige
        stoffen. Zo zie je meteen waar het tijd is om te luchten.
      </p>
    </section>

    <SummaryBar
      :rooms="state.rooms"
      :score="buildingScore"
      :scores="scores"
      :statuses="overallStatus"
      :counts="counts"
      :outdoor="state.outdoor"
      @select="(id) => select(id, true)"
    />

    <section id="plattegrond" class="section">
      <h2 class="section-title">Plattegrond. <span>Elke ruimte in één oogopslag.</span></h2>
      <div class="split">
        <div class="tile plan-tile">
          <div class="plan-head">
            <p class="plan-hint">Tik op een ruimte voor details</p>
            <div class="seg metric-switch" role="radiogroup" aria-label="Meetwaarde op plattegrond">
              <button
                v-for="m in METRICS"
                :id="`metric-${m.key}`"
                :key="m.key"
                type="button"
                role="radio"
                :aria-checked="metric === m.key"
                @click="metric = m.key"
              >
                {{ m.short }}
              </button>
            </div>
          </div>
          <FloorPlan
            :rooms="state.rooms"
            :metric="metric"
            :selected-id="selectedId"
            :outdoor="state.outdoor"
            @select="(id) => select(id, true)"
          />
          <ul class="plan-legend">
            <li class="legend-title">{{ metricDef.label }} in {{ metricDef.unit }}</li>
            <li data-status="goed"><i></i>{{ STATUS_LABEL.goed }} {{ limits.goed }}</li>
            <li data-status="matig"><i></i>{{ STATUS_LABEL.matig }} {{ limits.matig }}</li>
            <li data-status="slecht"><i></i>{{ STATUS_LABEL.slecht }} {{ limits.slecht }}</li>
          </ul>
        </div>

        <div ref="detailEl" class="detail-wrap">
          <RoomDetail
            v-if="selectedRoom"
            v-model:metric="metric"
            :room="selectedRoom"
            :status="overallStatus[selectedRoom.id]"
            :score="scores[selectedRoom.id]"
            :auto-vent="state.autoVent"
            :now="state.time"
            @toggle-boost="toggleBoost"
          />
        </div>
      </div>
    </section>

    <section id="ruimtes" class="section">
      <div class="section-head">
        <h2 class="section-title">Alle ruimtes. <span>{{ sortSub }}</span></h2>
        <div class="seg" role="radiogroup" aria-label="Sorteer ruimtes">
          <button
            v-for="s in SORTS"
            :id="`sort-${s.value}`"
            :key="s.value"
            type="button"
            role="radio"
            :aria-checked="sortBy === s.value"
            @click="sortBy = s.value"
          >
            {{ s.label }}
          </button>
        </div>
      </div>
      <div class="split rooms-split">
        <TransitionGroup tag="div" name="grid" class="room-grid">
          <RoomCard
            v-for="r in sortedRooms"
            :key="r.id"
            :room="r"
            :metric="metric"
            :status="overallStatus[r.id]"
            :selected="r.id === selectedId"
            @select="(id) => select(id, true)"
          />
        </TransitionGroup>
        <AlertFeed :alerts="state.alerts" @select="(id) => select(id, true)" />
      </div>
    </section>

    <section id="uitleg" class="section">
      <h2 class="section-title">Zo lees je de waarden. <span>Groen is goed, oranje matig, rood slecht.</span></h2>
      <div class="explain">
        <article v-for="m in METRICS" :key="m.key" class="tile explain-tile">
          <span class="explain-icon"><Icon :name="m.key" /></span>
          <h3>{{ m.label }}</h3>
          <p>{{ m.why }}</p>
          <ul>
            <li data-status="goed">
              <i></i><span><span class="num">{{ thresholdText(m).goed }}</span> {{ m.unit }}</span>
            </li>
            <li data-status="slecht">
              <i></i><span><span class="num">{{ thresholdText(m).slecht }}</span> {{ m.unit }}</span>
            </li>
          </ul>
        </article>
      </div>
    </section>
  </main>

  <footer class="footer">
    <div class="footer-inner">
      <p>
        Prototype voor een schoolproject. Alle meetwaarden op deze pagina zijn gesimuleerde demodata, gebaseerd op het
        lesrooster, de bezetting en de ventilatie van elke ruimte.
      </p>
      <p>
        Grenswaarden: CO₂ volgens Frisse Scholen, fijnstof volgens het WHO-advies, overige waarden volgens gangbare
        richtlijnen voor een gezond binnenklimaat.
      </p>
      <p class="footer-meta">Luchtmonitor · Hoofdgebouw, begane grond</p>
    </div>
  </footer>

  <div class="toolbar glass" role="toolbar" aria-label="Demo-instellingen">
    <span class="toolbar-tag">Demo</span>
    <div class="seg speed" role="radiogroup" aria-label="Simulatiesnelheid">
      <button
        v-for="s in SPEEDS"
        :id="`speed-${s.value}`"
        :key="s.value"
        type="button"
        role="radio"
        :aria-checked="state.speed === s.value"
        :aria-label="s.value === 0 ? 'Pauze' : `Snelheid ${s.label}`"
        @click="state.speed = s.value"
      >
        <Icon v-if="s.value === 0" name="pause" class="pause-icon" />
        <template v-else>{{ s.label }}</template>
      </button>
    </div>
    <span class="toolbar-sep" aria-hidden="true"></span>
    <label class="auto" for="auto-vent">
      <Icon name="wind" class="auto-icon" />
      <span class="auto-text">Automatisch ventileren</span>
      <button
        id="auto-vent"
        type="button"
        class="switch"
        role="switch"
        :aria-checked="state.autoVent"
        aria-label="Automatisch ventileren"
        @click="setAutoVent(!state.autoVent)"
      >
        <i></i>
      </button>
    </label>
    <button type="button" class="round-btn" aria-label="Demo opnieuw starten" title="Opnieuw" @click="reset">
      <Icon name="reset" />
    </button>
  </div>
</template>

<style scoped>
/* Navigatie (glas, plakt bovenaan) */
.globalnav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--nav-bg);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid var(--line);
  padding-top: env(safe-area-inset-top, 0px);
}
@media (prefers-reduced-transparency: reduce) {
  .globalnav {
    background: var(--surface);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}
.nav-inner {
  max-width: 1200px;
  margin: 0 auto;
  height: 52px;
  padding-inline: 22px;
  display: flex;
  align-items: center;
  gap: 24px;
}
.nav-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-right: auto;
  color: var(--ink);
  font-size: 21px;
  font-weight: 600;
  letter-spacing: 0.01em;
}
.nav-brand:hover {
  text-decoration: none;
}
.logo {
  width: 28px;
  height: 28px;
}
.logo rect {
  fill: var(--accent);
}
.logo path {
  fill: none;
  stroke: #fff;
  stroke-width: 2.4;
  stroke-linecap: round;
}
.nav-links {
  display: flex;
  gap: 24px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.nav-links a {
  color: var(--ink);
  opacity: 0.8;
  font-size: 12px;
  letter-spacing: -0.01em;
}
.nav-links a:hover {
  opacity: 1;
  text-decoration: none;
}
.nav-live {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 600;
  color: var(--goed);
}
.nav-live b {
  color: var(--ink);
  font-weight: 600;
}
.nav-live i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--goed-dot);
  animation: live 1.8s ease-out infinite;
}
.nav-live.paused {
  color: var(--ink-3);
}
.nav-live.paused i {
  background: var(--ink-3);
  animation: none;
}

/* Pagina */
.page {
  max-width: 1200px;
  margin: 0 auto;
  padding-inline: 22px;
  padding-block: 0 40px;
  display: grid;
  gap: 16px;
}

.hero {
  display: grid;
  justify-items: center;
  text-align: center;
  gap: 14px;
  padding-block: 72px 44px;
}
.eyebrow {
  font-size: 17px;
  font-weight: 600;
  color: var(--matig);
  letter-spacing: -0.022em;
}
h1 {
  font-size: clamp(44px, 7vw, 80px);
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.015em;
  max-width: 14ch;
}
.grad {
  background: linear-gradient(95deg, #0090f7 0%, #1fc8c0 55%, #34c759 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.hero-sub {
  max-width: 34em;
  font-size: 21px;
  line-height: 1.38;
  letter-spacing: 0.011em;
  color: var(--ink-2);
}

.section {
  display: grid;
  gap: 24px;
  padding-top: 88px;
}
.section-title {
  font-size: clamp(32px, 4.4vw, 48px);
  font-weight: 700;
  line-height: 1.08;
  letter-spacing: -0.003em;
  max-width: 22ch;
}
.section-title span {
  color: var(--ink-3);
}
.section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px 24px;
}

.split {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}
.plan-tile {
  display: grid;
  gap: 18px;
  padding: 24px;
}
@media (min-width: 1069px) {
  .plan-tile {
    position: sticky;
    top: 68px;
  }
}
.plan-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.plan-hint {
  font-size: 14px;
  color: var(--ink-3);
}
.metric-switch {
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
}
.plan-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  margin: 0;
  padding: 14px 0 0;
  list-style: none;
  border-top: 1px solid var(--line);
  font-size: 14px;
  color: var(--ink-2);
}
.plan-legend li {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.plan-legend i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--st-dot);
}
.legend-title {
  font-weight: 600;
  color: var(--ink);
}
.detail-wrap {
  scroll-margin-top: 68px;
}

.rooms-split {
  grid-template-columns: minmax(0, 2fr) minmax(300px, 1fr);
}
.room-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.grid-move {
  transition: transform 0.6s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.explain {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
}
.explain-tile {
  display: grid;
  align-content: start;
  gap: 10px;
  padding: 26px 22px;
}
.explain-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 24px;
  margin-bottom: 6px;
}
.explain-tile h3 {
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.explain-tile p {
  font-size: 14px;
  line-height: 1.43;
  color: var(--ink-2);
}
.explain-tile ul {
  display: grid;
  gap: 4px;
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
  font-size: 13px;
  color: var(--ink-2);
}
.explain-tile li {
  display: flex;
  align-items: baseline;
  gap: 7px;
}
.explain-tile li i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--st-dot);
  flex: none;
  transform: translateY(-1px);
}
.explain-tile li .num {
  color: var(--ink);
  font-weight: 600;
}

/* Footer (Apple-stijl kleine lettertjes) */
.footer {
  margin-top: 56px;
  border-top: 1px solid var(--line);
  padding-bottom: calc(110px + env(safe-area-inset-bottom, 0px));
}
.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 22px;
  display: grid;
  gap: 10px;
  font-size: 12px;
  line-height: 1.33;
  letter-spacing: -0.01em;
  color: var(--ink-3);
}
.footer-inner p {
  max-width: 90ch;
}
.footer-meta {
  padding-top: 10px;
  border-top: 1px solid var(--line);
  color: var(--ink-2);
}

/* Zwevende werkbalk (Liquid Glass) */
.toolbar {
  position: fixed;
  z-index: 60;
  left: 50%;
  bottom: calc(18px + env(safe-area-inset-bottom, 0px));
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 8px 7px 16px;
  border-radius: 999px;
  max-width: calc(100vw - 24px);
}
.toolbar-tag {
  font-size: 12px;
  font-weight: 700;
  color: var(--matig);
  letter-spacing: 0;
}
.toolbar .seg {
  background: rgb(120 120 128 / 0.14);
}
.speed button {
  min-width: 44px;
  padding: 0 12px;
}
.pause-icon {
  font-size: 15px;
  stroke-width: 2.6;
  vertical-align: -2px;
}
.toolbar-sep {
  width: 1px;
  height: 24px;
  background: var(--line-strong);
}
.auto {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}
.auto-icon {
  display: none;
  font-size: 20px;
  color: var(--ink-2);
}
.round-btn {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 50%;
  background: rgb(120 120 128 / 0.14);
  font-size: 18px;
  cursor: pointer;
  transition: background-color 0.15s;
}
.round-btn:hover {
  background: rgb(120 120 128 / 0.24);
}
.round-btn .icon {
  stroke-width: 2.2;
}

@media (max-width: 1068px) {
  .split,
  .rooms-split {
    grid-template-columns: minmax(0, 1fr);
  }
  /* 3 tegels boven, 2 brede eronder */
  .explain {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
  .explain-tile {
    grid-column: span 2;
  }
  .explain-tile:nth-child(n + 4) {
    grid-column: span 3;
  }
}
@media (max-width: 734px) {
  .nav-links {
    display: none;
  }
  .nav-inner {
    padding-inline: 16px;
  }
  .page {
    padding-inline: 16px;
  }
  .hero {
    padding-block: 44px 28px;
  }
  .hero-sub {
    font-size: 19px;
  }
  .section {
    padding-top: 60px;
    gap: 18px;
  }
  .room-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }
  .explain {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }
  .explain-tile,
  .explain-tile:nth-child(n + 4) {
    grid-column: auto;
  }
  .plan-tile {
    padding: 18px;
  }
  .toolbar {
    gap: 8px;
    padding: 6px 6px 6px 14px;
  }
  .toolbar-tag,
  .auto-text {
    display: none;
  }
  .auto-icon {
    display: block;
  }
  .speed button {
    min-width: 40px;
    padding: 0 9px;
  }
}

@keyframes live {
  0% {
    box-shadow: 0 0 0 0 rgb(52 199 89 / 0.55);
  }
  100% {
    box-shadow: 0 0 0 8px rgb(52 199 89 / 0);
  }
}
</style>
