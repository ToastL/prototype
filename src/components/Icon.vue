<script setup lang="ts">
export type IconName =
  | 'co2'
  | 'temp'
  | 'rh'
  | 'pm25'
  | 'tvoc'
  | 'wind'
  | 'alert'
  | 'check'
  | 'pause'
  | 'reset'
  | 'chevron'
  | 'sun'
  | 'people'

defineProps<{ name: IconName }>()
</script>

<template>
  <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
    <template v-if="name === 'co2'">
      <path d="M7 18.5h10.2a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.1 9.2 4.7 4.7 0 0 0 7 18.5z" />
    </template>
    <template v-else-if="name === 'temp'">
      <path d="M12 3.2a2.4 2.4 0 0 0-2.4 2.4v8.2a4.1 4.1 0 1 0 4.8 0V5.6A2.4 2.4 0 0 0 12 3.2z" />
      <path d="M12 9.5v7" />
    </template>
    <template v-else-if="name === 'rh'">
      <path d="M12 3.5S6 9.9 6 14a6 6 0 0 0 12 0c0-4.1-6-10.5-6-10.5z" />
    </template>
    <template v-else-if="name === 'pm25'">
      <circle cx="7.5" cy="8" r="2" />
      <circle cx="15.5" cy="6.5" r="1.4" />
      <circle cx="16.5" cy="14.5" r="2.6" />
      <circle cx="8.5" cy="16.5" r="1.8" />
    </template>
    <template v-else-if="name === 'tvoc'">
      <path d="M9.5 3.5h5M10.5 3.5v5.8L5.3 18a2 2 0 0 0 1.7 3h10a2 2 0 0 0 1.7-3l-5.2-8.7V3.5" />
      <path d="M8 15h8" />
    </template>
    <template v-else-if="name === 'wind'">
      <path d="M3.5 9h10.5a3 3 0 1 0-3-3M3.5 13.5h14.5a3 3 0 1 1-3 3M3.5 18h6" />
    </template>
    <template v-else-if="name === 'alert'">
      <path d="M12 7v6.5" />
      <path d="M12 17.2v.1" />
    </template>
    <template v-else-if="name === 'check'">
      <path d="M6 12.5l4 4 8-9" />
    </template>
    <template v-else-if="name === 'pause'">
      <path d="M9 6.5v11M15 6.5v11" />
    </template>
    <template v-else-if="name === 'reset'">
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
      <path d="M5 3.5v4h4" />
    </template>
    <template v-else-if="name === 'chevron'">
      <path d="M9.5 6l6 6-6 6" />
    </template>
    <template v-else-if="name === 'sun'">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </template>
    <template v-else-if="name === 'people'">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <circle cx="17" cy="9" r="2.3" />
      <path d="M15.5 14.2A4.5 4.5 0 0 1 21 18.5" />
    </template>
  </svg>
</template>

<style scoped>
.icon {
  width: 1em;
  height: 1em;
  flex: none;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
