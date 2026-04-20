export const WEEK_COUNT = 16

const campus = {
  core: [-118.2851, 34.0206],
  dormNorth: [-118.2869, 34.0213],
  library: [-118.2838, 34.0201],
  dining: [-118.2878, 34.0187],
  gym: [-118.2817, 34.0194],
  clubRoom: [-118.2804, 34.0225],
  cafe: [-118.2791, 34.0232],
  arts: [-118.2842, 34.0173],
  studentCenter: [-118.2858, 34.0192],
  wellness: [-118.2828, 34.0229],
  engineering: [-118.2860, 34.0188],
  plaza: [-118.2799, 34.0203],
  friendApt: [-118.2747, 34.0250],
}

const timelineLabels = Array.from({ length: WEEK_COUNT }, (_, i) => ({
  week: i + 1,
  label: i < 4 ? 'New semester energy' : i < 9 ? 'Routine forming' : i < 13 ? 'Midterm pressure' : 'Late semester narrowing',
}))

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function driftPoint([lng, lat], x, y) {
  return [lng + x, lat + y]
}

function buildWeek(def, weekIndex) {
  const t = clamp(weekIndex, 0, WEEK_COUNT - 1)
  const phase = def.phase ?? 0
  const connectedness = clamp(
    Math.round(def.baseConnectedness - t * def.drop + Math.sin(t * 0.8 + phase) * def.noise),
    12,
    98,
  )
  const socialRadiusKm = clamp(def.radiusStart - t * def.radiusDrop + Math.cos(t * 0.4 + phase) * 0.06, 0.35, 2.4)
  const student = driftPoint(
    def.home,
    Math.sin(t * 0.23 + phase) * def.walkX,
    Math.cos(t * 0.28 + phase) * def.walkY,
  )

  const activePlaces = def.places
    .filter((item) => t >= item.start && t <= item.end)
    .map((item, idx) => ({
      ...item,
      point: driftPoint(
        item.point,
        Math.sin(t * 0.45 + idx * 0.9 + phase) * 0.0015,
        Math.cos(t * 0.37 + idx * 0.7 + phase) * 0.0012,
      ),
      weight: item.weight * (1 - Math.min(0.35, t * 0.017)),
    }))

  const activePeople = def.people
    .filter((item) => t >= item.start && t <= item.end)
    .map((item, idx) => ({
      ...item,
      point: driftPoint(
        item.point,
        Math.cos(t * 0.35 + idx * 0.8 + phase) * 0.0012,
        Math.sin(t * 0.41 + idx * 0.6 + phase) * 0.0011,
      ),
      weight: item.weight * (1 - Math.min(0.34, t * 0.016)),
    }))

  return {
    week: t,
    label: timelineLabels[t].label,
    connectedness,
    socialRadiusKm,
    student,
    activePlaces,
    activePeople,
  }
}

const studentDefs = [
  {
    id: 'maya',
    name: 'Maya Chen',
    major: 'Journalism',
    year: 'Junior',
    bio: 'Active early in the term, then gradually more focused on a smaller circle of people.',
    color: '#9ed0ff',
    home: campus.dormNorth,
    baseConnectedness: 88,
    drop: 3.0,
    noise: 5,
    phase: 0.25,
    radiusStart: 2.25,
    radiusDrop: 0.11,
    walkX: 0.0010,
    walkY: 0.00085,
    places: [
      { id: 'maya-dorm', name: 'Dorm', point: campus.dormNorth, weight: 1.0, start: 0, end: 15 },
      { id: 'maya-library', name: 'Doheny Library', point: campus.library, weight: 0.86, start: 1, end: 15 },
      { id: 'maya-club', name: 'Club room', point: campus.clubRoom, weight: 0.8, start: 0, end: 8 },
      { id: 'maya-cafe', name: 'Cafe', point: campus.cafe, weight: 0.67, start: 4, end: 15 },
      { id: 'maya-friend', name: 'Friend apartment', point: campus.friendApt, weight: 0.56, start: 2, end: 10 },
    ],
    people: [
      { id: 'maya-roommate', name: 'Roommate', point: driftPoint(campus.dormNorth, 0.0004, 0.0002), weight: 0.96, start: 0, end: 15 },
      { id: 'maya-club', name: 'Club friends', point: driftPoint(campus.clubRoom, 0.0002, -0.0001), weight: 0.84, start: 0, end: 8 },
      { id: 'maya-study', name: 'Study buddy', point: driftPoint(campus.library, 0.0005, -0.0002), weight: 0.68, start: 3, end: 11 },
      { id: 'maya-new', name: 'New friend', point: driftPoint(campus.cafe, -0.0003, 0.0002), weight: 0.58, start: 6, end: 15 },
    ],
  },
  {
    id: 'jordan',
    name: 'Jordan Patel',
    major: 'Computer Engineering',
    year: 'Senior',
    bio: 'Strong lab-centered routine that narrows during midterms, with a few durable anchors.',
    color: '#86efac',
    home: campus.engineering,
    baseConnectedness: 82,
    drop: 2.7,
    noise: 4,
    phase: 1.0,
    radiusStart: 2.0,
    radiusDrop: 0.09,
    walkX: 0.0008,
    walkY: 0.0007,
    places: [
      { id: 'jordan-engineering', name: 'Engineering quad', point: campus.engineering, weight: 0.98, start: 0, end: 15 },
      { id: 'jordan-lab', name: 'Research lab', point: campus.library, weight: 0.9, start: 0, end: 15 },
      { id: 'jordan-gym', name: 'Gym', point: campus.gym, weight: 0.72, start: 2, end: 13 },
      { id: 'jordan-dining', name: 'Dining hall', point: campus.dining, weight: 0.8, start: 0, end: 15 },
      { id: 'jordan-plaza', name: 'Campus plaza', point: campus.plaza, weight: 0.55, start: 4, end: 12 },
    ],
    people: [
      { id: 'jordan-roommate', name: 'Roommate', point: driftPoint(campus.engineering, 0.0002, 0.0003), weight: 0.92, start: 0, end: 15 },
      { id: 'jordan-labmate', name: 'Lab partner', point: driftPoint(campus.library, -0.0002, 0.0001), weight: 0.9, start: 0, end: 15 },
      { id: 'jordan-team', name: 'Project team', point: driftPoint(campus.plaza, 0.0001, -0.0001), weight: 0.75, start: 1, end: 11 },
      { id: 'jordan-friend', name: 'Cousin', point: driftPoint(campus.cafe, 0.0002, 0.0003), weight: 0.52, start: 5, end: 14 },
    ],
  },
  {
    id: 'sofia',
    name: 'Sofia Alvarez',
    major: 'Psychology',
    year: 'Sophomore',
    bio: 'Starts broadly social, then becomes more selective with time, relying on fewer but closer ties.',
    color: '#fbbf24',
    home: campus.studentCenter,
    baseConnectedness: 90,
    drop: 3.3,
    noise: 5,
    phase: 1.7,
    radiusStart: 2.3,
    radiusDrop: 0.12,
    walkX: 0.0011,
    walkY: 0.00075,
    places: [
      { id: 'sofia-center', name: 'Student center', point: campus.studentCenter, weight: 1.0, start: 0, end: 15 },
      { id: 'sofia-wellness', name: 'Wellness center', point: campus.wellness, weight: 0.7, start: 1, end: 15 },
      { id: 'sofia-arts', name: 'Arts building', point: campus.arts, weight: 0.66, start: 0, end: 15 },
      { id: 'sofia-club', name: 'Service org room', point: campus.clubRoom, weight: 0.82, start: 0, end: 9 },
      { id: 'sofia-cafe', name: 'Cafe', point: campus.cafe, weight: 0.58, start: 3, end: 15 },
    ],
    people: [
      { id: 'sofia-roommate', name: 'Roommate', point: driftPoint(campus.studentCenter, 0.0003, -0.0002), weight: 0.94, start: 0, end: 15 },
      { id: 'sofia-service', name: 'Service squad', point: driftPoint(campus.clubRoom, -0.0001, 0.0002), weight: 0.84, start: 0, end: 9 },
      { id: 'sofia-mentor', name: 'Mentor', point: driftPoint(campus.arts, 0.0004, -0.0001), weight: 0.62, start: 2, end: 12 },
      { id: 'sofia-weekend', name: 'Weekend crew', point: driftPoint(campus.friendApt, 0.0002, 0.0001), weight: 0.66, start: 1, end: 7 },
    ],
  },
]

export const students = studentDefs.map((def) => ({
  id: def.id,
  name: def.name,
  major: def.major,
  year: def.year,
  bio: def.bio,
  color: def.color,
  weeks: Array.from({ length: WEEK_COUNT }, (_, weekIndex) => buildWeek(def, weekIndex)),
}))

export const weeklyConnectedness = Array.from({ length: WEEK_COUNT }, (_, i) => {
  const average = students.reduce((sum, student) => sum + student.weeks[i].connectedness, 0) / students.length
  return Math.round(average)
})

export const timelineWeeks = timelineLabels

export function getStudentById(studentId) {
  return students.find((student) => student.id === studentId) || students[0]
}

export function getWeekData(studentId, weekIndex) {
  const student = getStudentById(studentId)
  return student.weeks[clamp(weekIndex, 0, WEEK_COUNT - 1)]
}

export function getStudentMarkers(weekIndex, selectedStudentId = null) {
  const t = clamp(weekIndex, 0, WEEK_COUNT - 1)
  return students.map((student, index) => {
    const week = student.weeks[t]
    return {
      id: student.id,
      name: student.name,
      major: student.major,
      year: student.year,
      bio: student.bio,
      color: student.color,
      selected: student.id === selectedStudentId,
      connectedness: week.connectedness,
      point: week.student,
      order: index,
    }
  })
}
