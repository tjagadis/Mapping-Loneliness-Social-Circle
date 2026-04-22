<template>
  <div class="app-shell">
    <header class="hero">
      <div>
        <p class="eyebrow">USC semester visualization</p>
        <h1>Social circle over time</h1>
        <p class="intro">
          This dashboard uses synthetic Strava/Fitbit-style data: weekly distance moved, places visited,
          contacts, and a social radius that can shrink, stabilize, or grow depending on the student.
        </p>
      </div>

      <div class="hero-card">
        <div class="hero-stat">
          <span class="label">Selected</span>
          <strong>{{ selectedStudent.name }}</strong>
          <small>{{ selectedStudent.year }} · {{ selectedStudent.major }}</small>
        </div>
        <div class="hero-stat">
          <span class="label">Visible students</span>
          <strong>{{ visibleStudents.length }}</strong>
          <small>{{ cohortLabel }}</small>
        </div>
        <div class="hero-stat">
          <span class="label">Connectedness</span>
          <strong>{{ weekData.connectedness }}/100</strong>
          <small>{{ groupLabel }}</small>
        </div>
      </div>
    </header>

    <section class="filters panel">
      <div class="filter-block">
        <label for="cohort-filter">Class / cohort</label>
        <select id="cohort-filter" v-model="cohortFilter">
          <option v-for="option in cohortOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>

      <div class="filter-block">
        <label for="group-filter">Social group</label>
        <select id="group-filter" v-model="groupFilter">
          <option v-for="option in groupOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>

      <div class="filter-note">
        Showing {{ visibleStudents.length }} students. The map opens as a campus choropleth,
        then becomes a dot plot as you zoom in.
      </div>
    </section>

    <main class="layout">
      <section class="map-column">
        <MapView
          :week="week"
          :week-data="weekData"
          :full-week-data="fullWeekData"
          :student-markers="studentMarkers"
          :choropleth-zones="choroplethZones"
          :token="mapboxToken"
          @select-student="selectedStudentId = $event"
        />

        <TimeSlider v-model:week="week" :max-weeks="WEEK_COUNT" :label="currentLabel" />
      </section>

      <aside class="side">
        <div class="roster-scroll">
          <StudentRoster
            :students="visibleStudentsWithRisk"
            :selected-student-id="selectedStudentId"
            :week="week"
            @select-student="selectedStudentId = $event"
          />
        </div>

        <SocialStats
          :student-name="selectedStudent.name"
          :major="selectedStudent.major"
          :year="selectedStudent.year"
          :bio="selectedStudent.bio"
          :connectedness="weekData.connectedness"
          :distance-km="weekData.distanceKm"
          :steps="weekData.steps"
          :active-minutes="weekData.activeMinutes"
          :active-people="weekData.activePeople.length"
          :active-places="weekData.activePlaces.length"
          :social-radius-km="weekData.socialRadiusKm"
        />

        <TrendChart
          :student-name="selectedStudent.name"
          :values="selectedStudent.weeks.map((item) => item.distanceKm)"
          :connectedness-series="selectedStudent.weeks.map((item) => item.connectedness)"
          :radius-series="selectedStudent.weeks.map((item) => item.socialRadiusKm)"
          :active-week="week"
        />
      </aside>
    </main>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import MapView from './components/MapView.vue'
import TimeSlider from './components/TimeSlider.vue'
import SocialStats from './components/SocialStats.vue'
import TrendChart from './components/TrendChart.vue'
import StudentRoster from './components/StudentRoster.vue'
import {
  WEEK_COUNT,
  campusZones,
  getStudentById,
  getStudentMarkers,
  students,
  timelineWeeks,
  getWeekData,
  getRiskColor,
} from './data/uscSemester.js'

const cohortOptions = [
  { value: 'all', label: 'All classes' },
  { value: 'Freshman', label: 'Freshman' },
  { value: 'Sophomore', label: 'Sophomore' },
  { value: 'Junior', label: 'Junior' },
  { value: 'Senior', label: 'Senior' },
  { value: 'Grad', label: 'Grad' },
  { value: 'PhD', label: 'PhD' },
]

const groupOptions = [
  { value: 'all', label: 'All groups' },
  { value: 'academic', label: 'Academic' },
  { value: 'housing', label: 'Housing' },
  { value: 'social', label: 'Social' },
  { value: 'clubs', label: 'Clubs' },
  { value: 'dining', label: 'Dining' },
  { value: 'wellness', label: 'Wellness' },
  { value: 'athletics', label: 'Athletics' },
]

const week = ref(0)
const cohortFilter = ref('all')
const groupFilter = ref('all')
const selectedStudentId = ref(null)
const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || ''

const visibleStudents = computed(() => {
  const filtered = cohortFilter.value === 'all'
    ? students
    : students.filter((student) => student.year === cohortFilter.value)

  return filtered.length > 0 ? filtered : students
})

const visibleStudentsWithRisk = computed(() =>
  visibleStudents.value.map((student) => {
    const snapshot = student.weeks[week.value]
    return {
      ...student,
      riskColor: getRiskColor(snapshot.connectedness, snapshot.socialRadiusKm, snapshot.activePeople.length),
    }
  }),
)

const selectedStudent = computed(() => getStudentById(selectedStudentId.value))
const fullWeekData = computed(() => getWeekData(selectedStudentId.value, week.value))
const weekData = computed(() => getWeekData(selectedStudentId.value, week.value, { groupFilter: groupFilter.value }))
const currentLabel = computed(() => timelineWeeks[week.value].label)
const studentMarkers = computed(() => getStudentMarkers(week.value, selectedStudentId.value, cohortFilter.value))
const cohortLabel = computed(() => cohortOptions.find((option) => option.value === cohortFilter.value)?.label || 'All classes')
const groupLabel = computed(() => groupOptions.find((option) => option.value === groupFilter.value)?.label || 'All groups')

const choroplethZones = computed(() => {
  const cohortStudents = visibleStudents.value
  const selectedWeek = week.value

  return campusZones.map((zone) => {
    let totalVisits = 0
    let connectednessTotal = 0
    let matchedStudents = 0

    cohortStudents.forEach((student) => {
      const snapshot = student.weeks[selectedWeek]
      const matchingPlaces = snapshot.activePlaces.filter((place) => place.group === zone.group)
      if (matchingPlaces.length === 0) return

      matchedStudents += 1
      totalVisits += matchingPlaces.reduce((sum, place) => sum + Math.max(1, Math.round(place.weight * 3)), 0)
      connectednessTotal += snapshot.connectedness
    })

    const averageConnectedness = matchedStudents ? connectednessTotal / matchedStudents : 0
    const visitScore = Math.min(100, totalVisits * 16)
    const score = Math.round(averageConnectedness * 0.65 + visitScore * 0.35)

    return {
      ...zone,
      score,
      visits: totalVisits,
      students: matchedStudents,
    }
  })
})

watch(
  visibleStudents,
  (studentsList) => {
    if (!studentsList.some((student) => student.id === selectedStudentId.value)) {
      selectedStudentId.value = studentsList[0]?.id || students[0].id
    }
  },
  { immediate: true },
)
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
  margin-bottom: 20px;
}

.eyebrow {
  margin: 0 0 8px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
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
  max-width: 760px;
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
  min-width: min(100%, 560px);
}

.hero-stat {
  padding: 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  display: grid;
  gap: 6px;
}

.hero-stat strong {
  font-size: 20px;
  line-height: 1.25;
}

.hero-stat small {
  color: #9aa9c3;
  line-height: 1.35;
}

.filters {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  align-items: end;
  padding: 18px;
  margin-bottom: 20px;
}

.filter-block {
  display: grid;
  gap: 8px;
}

.filter-block label {
  color: #cfe0fb;
  font-size: 13px;
  letter-spacing: 0.02em;
}

.filter-block select {
  width: 100%;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.04);
  color: #e5eefb;
  padding: 12px 14px;
  outline: none;
}

.filter-note {
  color: #9aa9c3;
  font-size: 13px;
  line-height: 1.5;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px dashed rgba(148, 163, 184, 0.2);
  background: rgba(255, 255, 255, 0.02);
}

.layout {
  display: grid;
  grid-template-columns: 1.55fr 0.95fr;
  gap: 20px;
  align-items: start;
}

.map-column {
  display: grid;
  gap: 14px;
}

.side {
  display: grid;
  gap: 16px;
}

.roster-scroll {
  max-height: 320px;
  overflow-y: auto;
  padding-right: 6px;
}

@media (max-width: 1080px) {
  .hero,
  .layout,
  .filters {
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
}
</style>
