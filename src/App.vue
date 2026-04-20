<template>
  <div class="app-shell">
    <header class="hero">
      <div>
        <p class="eyebrow">USC semester visualization</p>
        <h1>Social circle over time</h1>
        <p class="intro">
          Click a student on the map to switch their semester story. The visualization shows how
          their places, people, and connectedness change across time.
        </p>
      </div>

      <div class="hero-card">
        <div class="hero-stat">
          <span class="label">Selected</span>
          <strong>{{ selectedStudent.name }}</strong>
        </div>
        <div class="hero-stat">
          <span class="label">Connectedness</span>
          <strong>{{ weekData.connectedness }}/100</strong>
        </div>
        <div class="hero-stat">
          <span class="label">Radius</span>
          <strong>{{ weekData.socialRadiusKm.toFixed(2) }} km</strong>
        </div>
      </div>
    </header>

    <main class="layout">
      <MapView
        :week="week"
        :week-data="weekData"
        :student-markers="studentMarkers"
        :token="mapboxToken"
        @select-student="selectedStudentId = $event"
      />

      <aside class="side">
        <StudentRoster
          :students="students"
          :selected-student-id="selectedStudentId"
          :week="week"
          @select-student="selectedStudentId = $event"
        />

        <TimeSlider v-model:week="week" :max-weeks="WEEK_COUNT" :label="currentLabel" />

        <SocialStats
          :student-name="selectedStudent.name"
          :major="selectedStudent.major"
          :year="selectedStudent.year"
          :bio="selectedStudent.bio"
          :connectedness="weekData.connectedness"
          :active-people="weekData.activePeople.length"
          :active-places="weekData.activePlaces.length"
          :social-radius-km="weekData.socialRadiusKm"
        />

        <TrendChart
          :values="selectedStudent.weeks.map((item) => item.connectedness)"
          :active-week="week"
          :student-name="selectedStudent.name"
        />

        <section class="panel note-panel">
          <div class="section-header">
            <div>
              <p class="eyebrow">Selected week</p>
              <h2>{{ currentLabel }}</h2>
            </div>
          </div>
          <p>
            The student markers are clickable. Each one swaps the map and sidebar to that person's
            synthetic USC semester data.
          </p>
        </section>
      </aside>
    </main>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import MapView from './components/MapView.vue'
import TimeSlider from './components/TimeSlider.vue'
import SocialStats from './components/SocialStats.vue'
import TrendChart from './components/TrendChart.vue'
import StudentRoster from './components/StudentRoster.vue'
import { WEEK_COUNT, getStudentById, getStudentMarkers, students, timelineWeeks } from './data/uscSemester.js'

const week = ref(0)
const selectedStudentId = ref(students[0].id)
const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || window.__MAPBOX_TOKEN__ || ''

const selectedStudent = computed(() => getStudentById(selectedStudentId.value))
const weekData = computed(() => selectedStudent.value.weeks[week.value])
const currentLabel = computed(() => timelineWeeks[week.value].label)
const studentMarkers = computed(() => getStudentMarkers(week.value, selectedStudentId.value))
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  padding: 32px;
}

.hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-start;
  margin-bottom: 24px;
}

.eyebrow {
  margin: 0 0 10px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 12px;
  color: #8fb4ff;
}

h1 {
  margin: 0;
  font-size: clamp(2rem, 3vw, 3.4rem);
  line-height: 1;
}

.intro {
  margin: 14px 0 0;
  max-width: 720px;
  color: #a8b7ce;
  font-size: 16px;
  line-height: 1.55;
}

.hero-card {
  display: grid;
  grid-template-columns: repeat(3, minmax(120px, 1fr));
  gap: 12px;
  background: rgba(15, 23, 42, 0.76);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 22px;
  padding: 16px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.26);
  min-width: min(100%, 540px);
}

.hero-stat {
  padding: 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
}

.label {
  display: block;
  font-size: 12px;
  color: #9aa9c3;
  margin-bottom: 6px;
}

.hero-stat strong {
  font-size: 20px;
  line-height: 1.25;
}

.layout {
  display: grid;
  grid-template-columns: 1.55fr 0.95fr;
  gap: 20px;
  align-items: start;
}

.side {
  display: grid;
  gap: 16px;
}

.panel {
  background: rgba(11, 18, 32, 0.82);
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 28px;
  box-shadow: 0 30px 100px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(18px);
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
  background: rgba(255,255,255,0.06);
  color: #d8e7fb;
  font-size: 13px;
  white-space: nowrap;
}

.note-panel {
  padding: 18px;
}

.note-panel p {
  margin: 0;
  color: #c6d4e8;
  line-height: 1.65;
}

@media (max-width: 1080px) {
  .hero,
  .layout {
    grid-template-columns: 1fr;
    display: grid;
  }

  .hero-card {
    min-width: 0;
  }
}

@media (max-width: 720px) {
  .app-shell {
    padding: 16px;
  }

  .hero-card {
    grid-template-columns: 1fr;
  }

  .panel {
    border-radius: 22px;
  }
}
</style>
