<script setup lang="ts">
import { STATUS_LABEL, type Status } from '../sim/metrics'

defineProps<{ status: Status; label?: string }>()
</script>

<template>
  <span class="pill" :data-status="status">
    <i aria-hidden="true"></i>
    {{ label ?? STATUS_LABEL[status] }}
  </span>
</template>

<style scoped>
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 11px 4px 9px;
  border-radius: 999px;
  background: var(--st-fill);
  color: var(--st);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.3;
  white-space: nowrap;
  transition:
    background-color 0.4s,
    color 0.4s;
}
i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--st-dot);
}
</style>
