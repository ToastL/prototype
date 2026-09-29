<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { fmt } from '../sim/metrics'

const props = withDefaults(defineProps<{ value: number; decimals?: number; tag?: string }>(), {
  decimals: 0,
  tag: 'span',
})

const shown = ref(props.value)
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
let frame = 0

watch(
  () => props.value,
  (to) => {
    cancelAnimationFrame(frame)
    const from = shown.value
    if (reduceMotion || from === to) {
      shown.value = to
      return
    }
    const start = performance.now()
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / 650)
      shown.value = from + (to - from) * (1 - (1 - p) ** 3)
      if (p < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
  },
)

onBeforeUnmount(() => cancelAnimationFrame(frame))
</script>

<template>
  <component :is="tag" class="num">{{ fmt(shown, decimals) }}</component>
</template>
