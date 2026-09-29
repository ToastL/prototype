<script setup lang="ts">
import { computed, ref } from 'vue'
import { useElementWidth } from '../composables/useElementWidth'

const props = withDefaults(defineProps<{ values: number[]; minSpan?: number; height?: number }>(), {
  minSpan: 1,
  height: 44,
})

const el = ref<HTMLElement | null>(null)
const width = useElementWidth(el)

const geo = computed(() => {
  const w = width.value
  const vals = props.values
  const h = props.height
  if (!w || vals.length < 2) return null
  let lo = Math.min(...vals)
  let hi = Math.max(...vals)
  if (hi - lo < props.minSpan) {
    const mid = (hi + lo) / 2
    lo = mid - props.minSpan / 2
    hi = mid + props.minSpan / 2
  }
  const x = (i: number) => 1 + (i / (vals.length - 1)) * (w - 6)
  const y = (v: number) => 4 + (1 - (v - lo) / (hi - lo)) * (h - 8)
  const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`)
  const line = `M${pts.join('L')}`
  return {
    line,
    area: `${line}L${x(vals.length - 1).toFixed(1)},${h}L${x(0).toFixed(1)},${h}Z`,
    end: [x(vals.length - 1), y(vals[vals.length - 1])] as const,
  }
})
</script>

<template>
  <div ref="el" class="spark" :style="{ height: `${height}px` }">
    <svg v-if="geo" :width="width" :height="height" aria-hidden="true">
      <path class="area" :d="geo.area" />
      <path class="line" :d="geo.line" />
      <circle class="end" :cx="geo.end[0]" :cy="geo.end[1]" r="3" />
    </svg>
  </div>
</template>

<style scoped>
.spark {
  width: 100%;
  min-width: 0;
}
svg {
  display: block;
  overflow: visible;
}
.area {
  fill: var(--st-dot, var(--accent));
  opacity: 0.14;
}
.line {
  fill: none;
  stroke: var(--st-dot, var(--accent));
  stroke-width: 1.6;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.end {
  fill: var(--surface);
  stroke: var(--st-dot, var(--accent));
  stroke-width: 2;
}
</style>
