<template>
  <section class="panel chart-panel">
    <div class="section-header">
      <div>
        <p class="eyebrow">Trend</p>
        <h2>{{ studentName }}</h2>
      </div>
    </div>

    <svg viewBox="0 0 420 140" class="chart-svg" role="img" aria-label="Connectedness chart">
      <polyline :points="points" class="trend-line" />
      <circle
        v-for="(value, index) in values"
        :key="index"
        :cx="x(index)"
        :cy="y(value)"
        r="4"
        class="trend-dot"
        :class="{ active: index === activeWeek }"
      />
    </svg>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  values: { type: Array, required: true },
  activeWeek: { type: Number, required: true },
  studentName: { type: String, required: true },
})

const x = (index) => 24 + (index * (420 - 48)) / Math.max(1, props.values.length - 1)
const y = (value) => 118 - ((Math.max(10, Math.min(100, value)) - 10) / 90) * 88
const points = computed(() => props.values.map((v, i) => `${x(i)},${y(v)}`).join(' '))
</script>

<style scoped>
.chart-panel { padding: 18px; }
.chart-svg { width: 100%; height: 140px; }
.trend-line { fill: none; stroke: #9ed0ff; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
.trend-dot { fill: rgba(255, 255, 255, 0.28); stroke: #d6e9ff; stroke-width: 1; }
.trend-dot.active { fill: #9ed0ff; }
</style>
