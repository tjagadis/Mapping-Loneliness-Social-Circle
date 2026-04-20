<template>
  <section class="panel stats-panel">
    <div class="section-header">
      <div>
        <p class="eyebrow">Snapshot</p>
        <h2>{{ studentName }}</h2>
        <p class="muted">{{ major }} · {{ year }}</p>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat">
        <span class="stat-label">Connectedness</span>
        <strong>{{ connectedness }}/100</strong>
      </div>
      <div class="stat">
        <span class="stat-label">Active people</span>
        <strong>{{ activePeople }}</strong>
      </div>
      <div class="stat">
        <span class="stat-label">Active places</span>
        <strong>{{ activePlaces }}</strong>
      </div>
      <div class="stat">
        <span class="stat-label">Social radius</span>
        <strong>{{ socialRadiusKm.toFixed(2) }} km</strong>
      </div>
    </div>

    <p class="bio">{{ bio }}</p>
  </section>
</template>

<script setup>
defineProps({
  studentName: { type: String, required: true },
  major: { type: String, required: true },
  year: { type: String, required: true },
  bio: { type: String, required: true },
  connectedness: { type: Number, required: true },
  activePeople: { type: Number, required: true },
  activePlaces: { type: Number, required: true },
  socialRadiusKm: { type: Number, required: true },
})
</script>

<style scoped>
.stats-panel { padding: 18px; }
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
.stat { padding: 12px; border-radius: 16px; background: rgba(255,255,255,0.03); }
.stat-label { display: block; font-size: 12px; color: #91a4bf; margin-bottom: 6px; }
.bio { margin: 14px 0 0; color: #c4d1e5; line-height: 1.6; }
.muted { margin: 8px 0 0; color: #8ea3bf; }
</style>
