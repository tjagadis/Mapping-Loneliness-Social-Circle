<template>
  <section class="panel chart-panel">
    <div class="section-header">
      <div>
        <p class="eyebrow">Trend</p>
        <h2>{{ studentName }}</h2>
        <p class="muted">Mobility and connectedness can move together, diverge, or recover at different points.</p>
      </div>
    </div>

    <div class="legend">
      <span><i class="line mobility"></i>Distance moved</span>
      <span><i class="line connection"></i>Connectedness</span>
      <span><i class="line radius"></i>Social radius</span>
    </div>

    <svg viewBox="0 0 360 180" class="chart" role="img" :aria-label="`${studentName} weekly trend chart`">
      <polyline :points="distancePoints" class="series mobility" />
      <polyline :points="connectednessPoints" class="series connection" />
      <polyline :points="radiusPoints" class="series radius" />

      <line class="active-line" :x1="activeX" y1="14" :x2="activeX" y2="160" />
      <circle :cx="activeX" :cy="distanceY(values[activeWeek] ?? 0)" r="4.5" class="active-dot mobility" />
      <circle :cx="activeX" :cy="connectednessY(valuesConnectedness[activeWeek] ?? 0)" r="4.5" class="active-dot connection" />
      <circle :cx="activeX" :cy="radiusY(valuesRadius[activeWeek] ?? 0)" r="4.5" class="active-dot radius" />
    </svg>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  studentName: { type: String, required: true },
  values: { type: Array, required: true },
  connectednessSeries: { type: Array, required: false, default: null },
  radiusSeries: { type: Array, required: false, default: null },
  activeWeek: { type: Number, required: true },
})

const valuesConnectedness = computed(() => props.connectednessSeries || props.values.map((v, i) => Math.max(12, 70 + i)))
const valuesRadius = computed(() => props.radiusSeries || props.values.map((v) => Math.max(0.4, v / 3)))

const width = 360
const height = 180
const paddingX = 18
const top = 16
const bottom = 152

function xForIndex(index) {
  const step = (width - paddingX * 2) / Math.max(1, props.values.length - 1)
  return paddingX + step * index
}

function normalize(series) {
  const min = Math.min(...series)
  const max = Math.max(...series)
  return series.map((value) => {
    if (max === min) return 0.5
    return (value - min) / (max - min)
  })
}

function yForValue(value, series) {
  const normalized = normalize(series)
  const idx = series.indexOf(value)
  const normalizedValue = idx >= 0 ? normalized[idx] : 0.5
  return top + (1 - normalizedValue) * (bottom - top)
}

function chartPoints(series) {
  return series.map((value, index) => `${xForIndex(index)},${yForValue(value, series)}`).join(' ')
}

const distancePoints = computed(() => chartPoints(props.values))
const connectednessPoints = computed(() => chartPoints(valuesConnectedness.value))
const radiusPoints = computed(() => chartPoints(valuesRadius.value))
const activeX = computed(() => xForIndex(props.activeWeek))

function distanceY(value) {
  return yForValue(value, props.values)
}
function connectednessY(value) {
  return yForValue(value, valuesConnectedness.value)
}
function radiusY(value) {
  return yForValue(value, valuesRadius.value)
}
</script>

<style scoped>
.chart-panel {
  padding: 18px;
}

.section-header {
  margin-bottom: 10px;
}

.section-header h2 {
  margin: 0;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  color: #b4c4de;
  font-size: 13px;
  margin-bottom: 8px;
}

.legend span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.line {
  width: 18px;
  height: 3px;
  display: inline-block;
  border-radius: 999px;
}

.chart {
  width: 100%;
  height: auto;
  display: block;
  overflow: visible;
}

.series {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.mobility {
  stroke: #9ed0ff;
}

.connection {
  stroke: #86efac;
}

.radius {
  stroke: #fbbf24;
}

.active-line {
  stroke: rgba(255, 255, 255, 0.22);
  stroke-width: 1;
  stroke-dasharray: 4 5;
}

.active-dot {
  stroke: #08101d;
  stroke-width: 2;
}
</style>
