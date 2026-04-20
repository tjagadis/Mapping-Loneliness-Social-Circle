<template>
  <section class="panel slider-panel">
    <div class="section-header">
      <div>
        <p class="eyebrow">Timeline</p>
        <h2>{{ label }}</h2>
        <p class="muted">Use the slider to scrub through the semester.</p>
      </div>
      <div class="metric">Week {{ week + 1 }} / {{ maxWeeks }}</div>
    </div>

    <input v-model.number="model" class="range" type="range" :min="0" :max="maxWeeks - 1" />

    <div class="ticks">
      <span>Start</span>
      <span>Midterm</span>
      <span>Wrap-up</span>
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
.slider-panel {
  padding: 18px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  margin-bottom: 14px;
}

.section-header h2 {
  margin: 0;
}

.metric {
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: #d8e7fb;
  font-size: 13px;
  white-space: nowrap;
}

.range {
  width: 100%;
}

.ticks {
  display: flex;
  justify-content: space-between;
  color: #8091ae;
  font-size: 12px;
  margin-top: 10px;
}
</style>
