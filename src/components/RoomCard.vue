<script setup lang="ts">
import { computed } from 'vue'
import AnimatedNumber from './AnimatedNumber.vue'
import Icon from './Icon.vue'
import Sparkline from './Sparkline.vue'
import StatusPill from './StatusPill.vue'
import { METRIC, METRICS, fmt, statusOf, type MetricKey, type Status } from '../sim/metrics'
import { TREND_LABEL, trendOf } from '../sim/format'
import type { RoomState } from '../sim/useAirSensors'

const props = defineProps<{ room: RoomState; metric: MetricKey; status: Status; selected: boolean }>()
const emit = defineEmits<{ select: [id: string] }>()

const def = computed(() => METRIC[props.metric])
const value = computed(() => props.room.reading[props.metric])
const metricStatus = computed(() => statusOf(def.value, value.value))
const spark = computed(() => [...props.room.history[props.metric].slice(-90), value.value])
const trend = computed(() => trendOf(props.room, props.metric))
const others = computed(() =>
  METRICS.filter((m) => m.key !== props.metric).map((m) => {
    const v = props.room.reading[m.key]
    return { m, text: fmt(v, m.decimals), status: statusOf(m, v) }
  }),
)
</script>

<template>
  <article class="card" :class="{ selected }">
    <header>
      <div class="title">
        <h3>
          <button type="button" class="card-link" :aria-pressed="selected" @click="emit('select', room.id)">
            {{ room.def.name }}
          </button>
        </h3>
        <p>{{ room.def.kind }}</p>
      </div>
      <StatusPill :status="status" />
    </header>

    <div class="main" :data-status="metricStatus">
      <div class="value">
        <span class="metric"><Icon :name="metric" />{{ def.short }}</span>
        <span class="big">
          <AnimatedNumber :value="value" :decimals="def.decimals" />
          <small>{{ def.unit }}</small>
        </span>
        <span class="trend">{{ TREND_LABEL[trend] }}</span>
      </div>
      <Sparkline :values="spark" :min-span="def.trendStep * 6" :height="52" />
    </div>

    <dl class="facts">
      <div v-for="o in others" :key="o.m.key" :data-status="o.status">
        <dt><i aria-hidden="true"></i>{{ o.m.short }}</dt>
        <dd class="num">
          {{ o.text }}<small>{{ o.m.unit }}</small>
        </dd>
      </div>
    </dl>

    <span v-if="room.boost !== 'uit'" class="boost">
      <Icon name="wind" />
      Ventilatie ×3 · {{ room.boost === 'automatisch' ? 'automatisch' : 'handmatig' }}
    </span>
  </article>
</template>

<style scoped>
.card {
  position: relative;
  container-type: inline-size;
  display: grid;
  gap: 16px;
  align-content: start;
  padding: 22px;
  background: var(--surface);
  border-radius: var(--r-l);
  transition:
    box-shadow 0.3s,
    transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.card:hover {
  transform: scale(1.012);
  box-shadow: var(--shadow-hover);
}
.card.selected {
  box-shadow: inset 0 0 0 2px var(--accent);
}
.card.selected:hover {
  box-shadow:
    inset 0 0 0 2px var(--accent),
    var(--shadow-hover);
}
.card:has(.card-link:focus-visible) {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}
.title {
  min-width: 0;
}
h3 {
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.25;
}
.card-link {
  all: unset;
  cursor: pointer;
}
.card-link::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
}
.title p {
  font-size: 14px;
  color: var(--ink-3);
}

.main {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: end;
  gap: 16px;
}
.value {
  display: grid;
  gap: 2px;
}
.metric {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-2);
}
.big {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-size: 36px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--st);
  transition: color 0.4s;
}
.big small {
  font-size: 14px;
  font-weight: 500;
  color: var(--ink-3);
}
.trend {
  font-size: 13px;
  color: var(--ink-3);
}

.facts {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}
.facts div {
  min-width: 0;
}
dt {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--ink-3);
  font-weight: 600;
}
dt i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--st-dot);
  flex: none;
}
dd {
  display: flex;
  align-items: baseline;
  gap: 2px;
  margin: 2px 0 0;
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
}
dd small {
  font-family: var(--font-ui);
  font-size: 11px;
  font-weight: 500;
  color: var(--ink-3);
}
.boost {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  background: var(--accent-soft);
  padding: 5px 12px;
  border-radius: 999px;
}

@container (max-width: 330px) {
  .facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
