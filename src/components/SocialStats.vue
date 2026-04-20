<template>
  <section class="panel stats-panel">
    <div class="section-header">
      <div>
        <p class="eyebrow">Snapshot</p>
        <h2>{{ studentName }}</h2>
        <p class="muted">The numbers come from synthetic activity logs, not direct loneliness measurement.</p>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <span class="label">Distance moved</span>
        <strong>{{ distanceKm.toFixed(1) }} km</strong>
      </div>
      <div class="stat-card">
        <span class="label">Steps</span>
        <strong>{{ steps.toLocaleString() }}</strong>
      </div>
      <div class="stat-card">
        <span class="label">Active minutes</span>
        <strong>{{ activeMinutes }}</strong>
      </div>
      <div class="stat-card">
        <span class="label">Places visited</span>
        <strong>{{ activePlaces }}</strong>
      </div>
      <div class="stat-card">
        <span class="label">Contacts active</span>
        <strong>{{ activePeople }}</strong>
      </div>
      <div class="stat-card">
        <span class="label">Social radius</span>
        <strong>{{ socialRadiusKm.toFixed(2) }} km</strong>
      </div>
    </div>

    <div class="bio">
      <p>
        <strong>{{ year }} {{ major }}</strong>
      </p>
      <p>{{ bio }}</p>
      <p class="muted">Connectedness score: {{ connectedness }}/100</p>
    </div>
  </section>
</template>

<script setup>
defineProps({
  studentName: { type: String, required: true },
  major: { type: String, required: true },
  year: { type: String, required: true },
  bio: { type: String, required: true },
  connectedness: { type: Number, required: true },
  distanceKm: { type: Number, required: true },
  steps: { type: Number, required: true },
  activeMinutes: { type: Number, required: true },
  activePeople: { type: Number, required: true },
  activePlaces: { type: Number, required: true },
  socialRadiusKm: { type: Number, required: true },
})
</script>

<style scoped>
.stats-panel {
  padding: 18px;
}

.section-header {
  margin-bottom: 14px;
}

.section-header h2 {
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.stat-card {
  padding: 12px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(148, 163, 184, 0.12);
  display: grid;
  gap: 6px;
}

.label {
  color: #9aa9c3;
  font-size: 12px;
}

.stat-card strong {
  font-size: 20px;
}

.bio {
  margin-top: 14px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(148, 163, 184, 0.12);
  line-height: 1.6;
}

.bio p {
  margin: 0 0 10px;
}

.bio p:last-child {
  margin-bottom: 0;
}
</style>
