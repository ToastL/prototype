<script setup lang="ts">
import { computed, ref } from 'vue'
import Icon from './Icon.vue'
import { fmtTime } from '../sim/format'
import type { Alert } from '../sim/useAirSensors'

const props = defineProps<{ alerts: Alert[] }>()
const emit = defineEmits<{ select: [id: string] }>()

const filter = ref<'alles' | 'waarschuwingen'>('alles')
const expanded = ref(false)

const filtered = computed(() =>
  filter.value === 'alles' ? props.alerts : props.alerts.filter((a) => a.level === 'matig' || a.level === 'slecht'),
)
const shown = computed(() => filtered.value.slice(0, expanded.value ? 40 : 7))
const iconFor = (a: Alert) => (a.level === 'info' ? 'wind' : a.level === 'goed' ? 'check' : 'alert')
</script>

<template>
  <section id="meldingen" class="feed tile" aria-labelledby="feed-title">
    <header>
      <h3 id="feed-title">Meldingen</h3>
      <div class="seg" role="radiogroup" aria-label="Filter meldingen">
        <button id="feed-all" type="button" role="radio" :aria-checked="filter === 'alles'" @click="filter = 'alles'">
          Alles
        </button>
        <button
          id="feed-warn"
          type="button"
          role="radio"
          :aria-checked="filter === 'waarschuwingen'"
          @click="filter = 'waarschuwingen'"
        >
          Waarschuwingen
        </button>
      </div>
    </header>

    <TransitionGroup v-if="shown.length" tag="ol" name="feed" aria-live="polite">
      <li v-for="a in shown" :key="a.id" :data-status="a.level === 'info' ? undefined : a.level">
        <button type="button" @click="emit('select', a.roomId)">
          <span class="badge" :class="{ info: a.level === 'info' }"><Icon :name="iconFor(a)" /></span>
          <span class="body">
            <span class="line1">
              <strong>{{ a.title }}</strong>
              <time class="num">{{ fmtTime(a.time) }}</time>
            </span>
            <span class="line2">{{ a.roomName }} · <span class="num">{{ a.detail }}</span></span>
          </span>
        </button>
      </li>
    </TransitionGroup>
    <p v-else class="empty">Geen waarschuwingen. Alle ruimtes zijn in orde.</p>

    <button v-if="filtered.length > 7" type="button" class="more-link" @click="expanded = !expanded">
      {{ expanded ? 'Minder tonen' : `Toon ${Math.min(40, filtered.length) - 7} oudere meldingen` }}
      <Icon name="chevron" class="chev" :class="{ up: expanded }" />
    </button>
  </section>
</template>

<style scoped>
.feed {
  display: grid;
  gap: 16px;
  padding: 26px 24px;
  align-content: start;
}
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
h3 {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0.005em;
}
ol {
  list-style: none;
  margin: 0 -10px;
  padding: 0;
  display: grid;
}
li {
  position: relative;
}
li + li::before {
  content: '';
  position: absolute;
  top: 0;
  left: 54px;
  right: 10px;
  border-top: 1px solid var(--line);
}
li button {
  all: unset;
  box-sizing: border-box;
  width: 100%;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  padding: 10px;
  border-radius: 14px;
  cursor: pointer;
  transition: background-color 0.15s;
}
li button:hover {
  background: var(--fill);
}
li button:focus-visible {
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
.badge.info {
  background: var(--accent);
}
.badge .icon {
  stroke-width: 2.5;
}
.body {
  display: grid;
  min-width: 0;
  line-height: 1.3;
}
.line1 {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
}
strong {
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
time {
  font-size: 13px;
  color: var(--ink-3);
  flex: none;
}
.line2 {
  font-size: 13px;
  color: var(--ink-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.empty {
  color: var(--ink-2);
  font-size: 15px;
}
.more-link {
  justify-self: start;
}
.chev {
  font-size: 13px;
  transform: rotate(90deg);
  transition: transform 0.2s;
}
.chev.up {
  transform: rotate(-90deg);
}

.feed-enter-active {
  transition:
    opacity 0.5s,
    transform 0.5s;
}
.feed-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.feed-leave-active {
  display: none;
}

@media (max-width: 734px) {
  .feed {
    padding: 22px 18px;
  }
}
</style>
