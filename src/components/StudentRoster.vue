<template>
  <section class="panel roster-panel">
    <div class="section-header">
      <div>
        <p class="eyebrow">Students</p>
        <h2>Click a student</h2>
        <p class="muted">Each student has synthetic Strava/Fitbit-style mobility data.</p>
      </div>
    </div>

    <div class="roster-list">
      <button
        v-for="student in students"
        :key="student.id"
        class="roster-item"
        :class="{ active: student.id === selectedStudentId }"
        @click="$emit('select-student', student.id)"
      >
        <span class="swatch" :style="{ background: student.riskColor || student.color }"></span>
        <span class="meta">
          <strong>{{ student.name }}</strong>
          <small>{{ student.major }} · {{ student.year }}</small>
        </span>
        <span class="week-score">{{ student.weeks[week].connectedness }}/100</span>
      </button>
    </div>
  </section>
</template>

<script setup>
defineProps({
  students: { type: Array, required: true },
  selectedStudentId: { type: String, required: true },
  week: { type: Number, required: true },
})

defineEmits(['select-student'])
</script>

<style scoped>
.roster-panel {
  padding: 18px;
}

.section-header {
  margin-bottom: 14px;
}

.section-header h2 {
  margin: 0;
}

.roster-list {
  display: grid;
  gap: 10px;
}

.roster-item {
  display: grid;
  grid-template-columns: 16px 1fr auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  text-align: left;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.03);
  padding: 12px;
  color: #e5eefb;
  cursor: pointer;
}

.roster-item.active {
  border-color: rgba(158, 208, 255, 0.6);
  background: rgba(158, 208, 255, 0.08);
}

.swatch {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.05);
}

.meta {
  display: grid;
  gap: 2px;
}

.meta strong {
  font-size: 14px;
}

.meta small {
  color: #9aa9c3;
}

.week-score {
  font-size: 13px;
  color: #d8e7fb;
}
</style>
