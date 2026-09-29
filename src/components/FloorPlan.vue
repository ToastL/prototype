<script setup lang="ts">
import { computed } from 'vue'
import AnimatedNumber from './AnimatedNumber.vue'
import { METRIC, fmtMetric, statusOf, type MetricKey, type Readings } from '../sim/metrics'
import { COURTYARD, OTHER_AREAS } from '../sim/rooms'
import type { RoomState } from '../sim/useAirSensors'

const props = defineProps<{
  rooms: RoomState[]
  metric: MetricKey
  selectedId: string
  outdoor: Readings
}>()
const emit = defineEmits<{ select: [id: string] }>()

const def = computed(() => METRIC[props.metric])
const selected = computed(() => props.rooms.find((r) => r.id === props.selectedId))

const items = computed(() =>
  props.rooms.map((r) => {
    const value = r.reading[props.metric]
    return {
      room: r,
      value,
      status: statusOf(def.value, value),
      label: `${r.def.name}: ${def.value.label} ${fmtMetric(def.value, value)}`,
    }
  }),
)
</script>

<template>
  <div class="plan">
    <svg viewBox="0 0 1000 880" role="group" aria-label="Plattegrond begane grond">
      <g v-for="a in OTHER_AREAS" :key="a.id" class="other">
        <path :d="a.path" />
        <text :x="a.label[0]" :y="a.label[1]" text-anchor="middle" dy="0.35em">{{ a.name }}</text>
      </g>

      <g class="courtyard">
        <path :d="COURTYARD.path" />
        <g :transform="`translate(${COURTYARD.label[0]} ${COURTYARD.label[1]})`">
          <text class="room-name" y="-22" text-anchor="middle">Buiten</text>
          <text class="room-value" y="14" text-anchor="middle">
            <AnimatedNumber tag="tspan" :value="outdoor[metric]" :decimals="def.decimals" />
          </text>
          <text class="room-unit" y="38" text-anchor="middle">{{ def.unit }}</text>
        </g>
      </g>

      <g
        v-for="it in items"
        :key="it.room.id"
        class="room"
        :class="{ selected: it.room.id === selectedId }"
        :data-status="it.status"
        role="button"
        tabindex="0"
        :aria-label="it.label"
        :aria-pressed="it.room.id === selectedId"
        @click="emit('select', it.room.id)"
        @keydown.enter.prevent="emit('select', it.room.id)"
        @keydown.space.prevent="emit('select', it.room.id)"
      >
        <path class="room-shape" :d="it.room.def.path" />
      </g>

      <line class="wall-acoustic" x1="349" y1="145" x2="521" y2="145" />
      <text class="annotation" x="435" y="172" text-anchor="middle">akoestische wand</text>
      <line class="wall-glass" x1="40" y1="690" x2="330" y2="860" />
      <text class="annotation" transform="translate(172 798) rotate(30.4)" text-anchor="middle">
        ingang · glazen wand
      </text>

      <path v-if="selected" class="highlight" :d="selected.def.path" />

      <g
        v-for="it in items"
        :key="`l-${it.room.id}`"
        class="label"
        :class="{ narrow: it.room.def.narrow }"
        :data-status="it.status"
        :transform="`translate(${it.room.def.label[0]} ${it.room.def.label[1]})`"
        aria-hidden="true"
      >
        <circle class="sensor-pulse" cy="-56" r="7" />
        <circle class="sensor" cy="-56" r="7" />
        <text class="room-name" y="-22" text-anchor="middle">{{ it.room.def.name }}</text>
        <text class="room-value" y="14" text-anchor="middle">
          <AnimatedNumber tag="tspan" :value="it.value" :decimals="def.decimals" />
        </text>
        <text class="room-unit" y="38" text-anchor="middle">{{ def.unit }}</text>
        <text v-if="it.room.boost !== 'uit'" class="room-boost" y="64" text-anchor="middle">ventilatie ×3</text>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.plan {
  container-type: inline-size;
  width: 100%;
}
svg {
  display: block;
  width: 100%;
  height: auto;
  font-family: var(--font-ui);
  user-select: none;
}

/* Kamers liggen als tegels naast elkaar; de witte rand vormt de voeg */
.other path,
.courtyard path,
.room-shape {
  stroke: var(--surface);
  stroke-width: 8;
  stroke-linejoin: round;
}
.other path {
  fill: var(--fill);
}
.other text {
  fill: var(--ink-3);
  font-size: 15px;
  font-weight: 500;
}
.courtyard path {
  fill: var(--park);
}
.courtyard .room-name,
.courtyard .room-value {
  fill: var(--goed);
}
.courtyard .room-unit {
  fill: var(--goed);
  opacity: 0.8;
}

.room {
  cursor: pointer;
  outline: none;
}
.room-shape {
  fill: var(--st-fill);
  transition: fill 0.6s;
}
.room:hover .room-shape {
  fill: var(--st-line);
}
.room:focus-visible .room-shape {
  stroke: var(--accent);
  stroke-width: 6;
}
.highlight {
  fill: none;
  stroke: var(--accent);
  stroke-width: 5;
  stroke-linejoin: round;
  pointer-events: none;
}

.wall-acoustic {
  stroke: var(--ink-3);
  stroke-width: 5;
  stroke-dasharray: 1 7;
  stroke-linecap: round;
}
.wall-glass {
  stroke: var(--accent);
  stroke-width: 5;
  stroke-linecap: round;
  opacity: 0.5;
}
.annotation {
  fill: var(--ink-3);
  font-size: 14px;
}

.label {
  pointer-events: none;
}
.sensor {
  fill: var(--st-dot);
  stroke: var(--surface);
  stroke-width: 3;
  transition: fill 0.6s;
}
.sensor-pulse {
  fill: var(--st-dot);
  transform-box: fill-box;
  transform-origin: center;
  animation: pulse 2.4s ease-out infinite;
}
.room-name {
  fill: var(--ink);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.02em;
}
.room-value {
  fill: var(--ink);
  font-family: var(--font-num);
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
.room-unit {
  fill: var(--ink-2);
  font-size: 14px;
}
.room-boost {
  fill: var(--accent);
  font-size: 14px;
  font-weight: 600;
}
.narrow .room-name {
  font-size: 15px;
}
.narrow .room-value {
  font-size: 27px;
}

@container (max-width: 560px) {
  .room-name,
  .room-unit,
  .room-boost,
  .other text,
  .annotation {
    display: none;
  }
  .room-value,
  .narrow .room-value {
    font-size: 42px;
  }
  .sensor,
  .sensor-pulse {
    r: 11px;
    cy: -42px;
  }
}

@keyframes pulse {
  from {
    transform: scale(1);
    opacity: 0.45;
  }
  to {
    transform: scale(2.8);
    opacity: 0;
  }
}
</style>
