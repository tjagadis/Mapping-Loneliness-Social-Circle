<template>
  <section class="panel slider-panel">
    <div class="section-header">
      <div>
        <p class="eyebrow">Time</p>
        <h2>{{ label }}</h2>
      </div>
      <div class="metric">Week {{ week + 1 }} / {{ maxWeeks }}</div>
    </div>

    <input v-model.number="model" class="slider" type="range" :min="0" :max="maxWeeks - 1" />

    <div class="tick-row">
      <span>Start</span>
      <span>Midterm</span>
      <span>Finals</span>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  week: { type: Number, required: true },
  maxWeeks: { type: Number, required: true },
  label: { type: String, required: true },
})

const emit = defineEmits(['update:week'])

const model = computed({
  get: () => props.week,
  set: (value) => emit('update:week', Number(value)),
})
</script>

<style scoped>
.slider-panel { padding: 18px; }
.slider { width: 100%; margin: 18px 0 10px; }
.tick-row { display: flex; justify-content: space-between; color: #8aa0bc; font-size: 12px; }
</style>
