<template>
  <section class="panel roster-panel">
    <div class="section-header">
      <div>
        <p class="eyebrow">Students</p>
        <h2>Pick a person</h2>
      </div>
    </div>

    <div class="roster">
      <button
        v-for="student in students"
        :key="student.id"
        class="student-card"
        :class="{ active: student.id === selectedStudentId }"
        type="button"
        @click="$emit('select-student', student.id)"
      >
        <span class="color-dot" :style="{ background: student.color }"></span>
        <span class="student-copy">
          <strong>{{ student.name }}</strong>
          <span>{{ student.major }} · {{ student.year }}</span>
          <small>{{ student.bio }}</small>
        </span>
        <span class="score">{{ student.weeks[week].connectedness }}</span>
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
.roster-panel { padding: 18px; }
.roster { display: grid; gap: 10px; }
.student-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: start;
  width: 100%;
  padding: 12px;
  border: 1px solid rgba(148,163,184,0.14);
  border-radius: 18px;
  background: rgba(255,255,255,0.03);
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.student-card.active { border-color: rgba(158,208,255,0.55); background: rgba(158,208,255,0.08); }
.color-dot { width: 14px; height: 14px; border-radius: 999px; margin-top: 4px; }
.student-copy { display: grid; gap: 4px; }
.student-copy span, .student-copy small { color: #8fa3bd; line-height: 1.4; }
.score { color: #e9f4ff; font-weight: 700; }
</style>
