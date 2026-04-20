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
  engineering: [-118.286, 34.0188],
  plaza: [-118.2799, 34.0203],
  friendApt: [-118.2747, 34.025],
  stadiumWalk: [-118.2865, 34.0158],
}

const timelineWeeks = Array.from({ length: WEEK_COUNT }, (_, i) => {
  const labels = [
    'Move-in and new faces',
    'Finding routines',
    'Club fair energy',
    'First assignments',
    'Class rhythm settles',
    'Weeknight study groups',
    'Early social momentum',
    'Midterm pressure',
    'Midterm recovery',
    'Shared routines return',
    'Project season',
    'Campus event weeks',
    'Late fall networking',
    'Friend groups stabilize',
    'Final stretch',
    'Semester wrap-up',
  ]

  return {
    week: i + 1,
    label: labels[i],
  }
})

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function wave(week, amplitude, period, phase = 0) {
  return Math.sin((week / period) * Math.PI * 2 + phase) * amplitude
}

function shiftPoint([lng, lat], lngDelta, latDelta) {
  return [lng + lngDelta, lat + latDelta]
}

function buildPlace(place, week, phase) {
  if (week < place.start || week > place.end) return null

  const duration = Math.max(1, place.end - place.start)
  const progress = (week - place.start) / duration
  const weight = clamp(
    place.baseWeight + progress * place.growth + wave(week, place.waveAmp, place.wavePeriod, phase + place.phase),
    0.18,
    1,
  )

  return {
    id: place.id,
    name: place.name,
    point: shiftPoint(
      place.point,
      wave(week, place.lngJitter, place.lngPeriod, phase + place.phase),
      wave(week, place.latJitter, place.latPeriod, phase * 0.7 + place.phase),
    ),
    weight,
  }
}

function buildPerson(person, week, phase) {
  if (week < person.start || week > person.end) return null

  const duration = Math.max(1, person.end - person.start)
  const progress = (week - person.start) / duration
  const weight = clamp(
    person.baseWeight + progress * person.growth + wave(week, person.waveAmp, person.wavePeriod, phase + person.phase),
    0.16,
    1,
  )

  return {
    id: person.id,
    name: person.name,
    point: shiftPoint(
      person.point,
      wave(week, person.lngJitter, person.lngPeriod, phase + person.phase),
      wave(week, person.latJitter, person.latPeriod, phase * 0.8 + person.phase),
    ),
    weight,
  }
}

function buildWeek(def, week) {
  const phase = def.phase

  const mobilityScore = def.strictDecline
    ? clamp(def.mobilityStart - week * def.mobilityStep, 0.8, 9.5)
    : clamp(
        def.mobilityBase + week * def.mobilitySlope + wave(week, def.mobilityWave, def.mobilityPeriod, phase),
        0.8,
        9.5,
      )

  const distanceKm = def.strictDecline
    ? clamp(def.distanceStart - week * def.distanceStep, 0.7, 18)
    : clamp(
        def.distanceBase + week * def.distanceSlope + wave(week, def.distanceWave, def.distancePeriod, phase + 0.4),
        0.7,
        18,
      )

  const steps = Math.round(distanceKm * 1250 + mobilityScore * 900 + 1800 + wave(week, 500, 4, phase))
  const activeMinutes = Math.round(28 + distanceKm * 11 + mobilityScore * 8 + wave(week, 12, 5, phase + 0.2))

  const connectedness = def.strictDecline
    ? clamp(Math.round(def.connectednessStart - week * def.connectednessStep), 8, 98)
    : clamp(
        Math.round(def.connectednessBase + week * def.connectednessSlope + wave(week, def.connectednessWave, def.connectednessPeriod, phase + 0.9)),
        8,
        98,
      )

  const socialRadiusKm = def.strictDecline
    ? clamp(def.radiusStart - week * def.radiusStep, 0.4, 3.4)
    : clamp(
        0.55 + distanceKm * 0.12 + connectedness * 0.012 + wave(week, def.radiusWave, def.radiusPeriod, phase + 0.5),
        0.4,
        3.4,
      )

  const activityPoint = def.strictDecline
    ? shiftPoint(def.anchor, week * def.walkLngStep, week * def.walkLatStep)
    : shiftPoint(
        def.anchor,
        wave(week, def.walkLng, def.walkPeriod, phase),
        wave(week, def.walkLat, def.walkPeriod, phase + 1.1),
      )

  // rest of function stays the same


  const activePlaces = def.places
    .map((place) => buildPlace(place, week, phase))
    .filter(Boolean)

  const activePeople = def.people
    .map((person) => buildPerson(person, week, phase))
    .filter(Boolean)

  const placeVisits = activePlaces.reduce((sum, place) => sum + Math.round(place.weight * 4), 0)

  return {
    week,
    label: timelineWeeks[week].label,
    activityPoint,
    distanceKm,
    steps,
    activeMinutes,
    connectedness,
    socialRadiusKm,
    placeVisits,
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
  bio: 'Begins socially wide, then steadily contracts across the semester until only a very small circle remains.',
  color: '#9ed0ff',
  anchor: campus.dormNorth,
  phase: 0.3,
  strictDecline: true,
  mobilityStart: 6.1,
  mobilityStep: 0.12,
  distanceStart: 6.0,
  distanceStep: 0.24,
  connectednessStart: 88,
  connectednessStep: 4,
  radiusStart: 3.0,
  radiusStep: 0.16,
  walkLngStep: 0.00035,
  walkLatStep: 0.00022,
  places: [
    { id: 'maya-dorm', name: 'Dorm', point: campus.dormNorth, baseWeight: 1, growth: -0.02, start: 0, end: 15, waveAmp: 0.01, wavePeriod: 4, phase: 0.1, lngJitter: 0.00008, latJitter: 0.00008, lngPeriod: 4, latPeriod: 5 },
    { id: 'maya-library', name: 'Doheny Library', point: campus.library, baseWeight: 0.82, growth: -0.12, start: 0, end: 11, waveAmp: 0.015, wavePeriod: 5, phase: 0.5, lngJitter: 0.00008, latJitter: 0.00008, lngPeriod: 4, latPeriod: 4 },
    { id: 'maya-club', name: 'Club room', point: campus.clubRoom, baseWeight: 0.68, growth: -0.2, start: 0, end: 7, waveAmp: 0.01, wavePeriod: 3, phase: 0.8, lngJitter: 0.00006, latJitter: 0.00006, lngPeriod: 4, latPeriod: 5 },
    { id: 'maya-cafe', name: 'Cafe', point: campus.cafe, baseWeight: 0.5, growth: -0.18, start: 0, end: 6, waveAmp: 0.01, wavePeriod: 4, phase: 0.2, lngJitter: 0.00005, latJitter: 0.00005, lngPeriod: 3, latPeriod: 4 },
    { id: 'maya-friend', name: 'Friend apartment', point: campus.friendApt, baseWeight: 0.34, growth: -0.16, start: 0, end: 4, waveAmp: 0.01, wavePeriod: 5, phase: 1.2, lngJitter: 0.00005, latJitter: 0.00005, lngPeriod: 4, latPeriod: 4 },
  ],
  people: [
    { id: 'maya-roommate', name: 'Roommate', point: shiftPoint(campus.dormNorth, 0.0002, 0.0001), baseWeight: 0.94, growth: -0.02, start: 0, end: 15, waveAmp: 0.01, wavePeriod: 4, phase: 0.4, lngJitter: 0.00005, latJitter: 0.00005, lngPeriod: 4, latPeriod: 4 },
    { id: 'maya-club', name: 'Club friends', point: shiftPoint(campus.clubRoom, 0.0001, -0.00005), baseWeight: 0.8, growth: -0.22, start: 0, end: 7, waveAmp: 0.01, wavePeriod: 3, phase: 0.9, lngJitter: 0.00005, latJitter: 0.00005, lngPeriod: 3, latPeriod: 4 },
    { id: 'maya-study', name: 'Study buddy', point: shiftPoint(campus.library, 0.0002, -0.0001), baseWeight: 0.52, growth: -0.1, start: 0, end: 9, waveAmp: 0.01, wavePeriod: 4, phase: 0.6, lngJitter: 0.00005, latJitter: 0.00005, lngPeriod: 5, latPeriod: 4 },
    { id: 'maya-new', name: 'New friend', point: shiftPoint(campus.cafe, -0.0001, 0.0001), baseWeight: 0.22, growth: -0.08, start: 0, end: 5, waveAmp: 0.01, wavePeriod: 5, phase: 1.1, lngJitter: 0.00005, latJitter: 0.00005, lngPeriod: 4, latPeriod: 4 },
  ],
},
  {
    id: 'jordan',
    name: 'Jordan Patel',
    major: 'Computer Engineering',
    year: 'Senior',
    bio: 'A stable lab-centered routine with a steadily strong circle and a few late-semester spikes.',
    color: '#86efac',
    anchor: campus.engineering,
    phase: 1.0,
    mobilityBase: 6.8,
    mobilitySlope: 0.08,
    mobilityWave: 0.9,
    mobilityPeriod: 5,
    distanceBase: 6.3,
    distanceSlope: 0.15,
    distanceWave: 1.1,
    distancePeriod: 6,
    connectednessBase: 68,
    connectednessSlope: 0.45,
    connectednessWave: 5,
    connectednessPeriod: 6,
    radiusWave: 0.13,
    radiusPeriod: 5,
    walkLng: 0.0008,
    walkLat: 0.0007,
    walkPeriod: 4,
    places: [
      { id: 'jordan-engineering', name: 'Engineering quad', point: campus.engineering, baseWeight: 0.98, growth: 0, start: 0, end: 15, waveAmp: 0.03, wavePeriod: 4, phase: 0.2, lngJitter: 0.0002, latJitter: 0.0002, lngPeriod: 4, latPeriod: 5 },
      { id: 'jordan-lab', name: 'Research lab', point: campus.library, baseWeight: 0.9, growth: 0.04, start: 0, end: 15, waveAmp: 0.04, wavePeriod: 5, phase: 0.7, lngJitter: 0.00018, latJitter: 0.00015, lngPeriod: 4, latPeriod: 4 },
      { id: 'jordan-gym', name: 'Gym', point: campus.gym, baseWeight: 0.58, growth: 0.12, start: 2, end: 13, waveAmp: 0.08, wavePeriod: 4, phase: 0.5, lngJitter: 0.0002, latJitter: 0.00018, lngPeriod: 4, latPeriod: 4 },
      { id: 'jordan-dining', name: 'Dining hall', point: campus.dining, baseWeight: 0.82, growth: 0.03, start: 0, end: 15, waveAmp: 0.03, wavePeriod: 4, phase: 0.1, lngJitter: 0.00015, latJitter: 0.00015, lngPeriod: 4, latPeriod: 4 },
      { id: 'jordan-plaza', name: 'Campus plaza', point: campus.plaza, baseWeight: 0.44, growth: 0.18, start: 4, end: 12, waveAmp: 0.08, wavePeriod: 3, phase: 1.2, lngJitter: 0.00012, latJitter: 0.00012, lngPeriod: 4, latPeriod: 4 },
    ],
    people: [
      { id: 'jordan-roommate', name: 'Roommate', point: shiftPoint(campus.engineering, 0.0002, 0.0003), baseWeight: 0.92, growth: 0.02, start: 0, end: 15, waveAmp: 0.02, wavePeriod: 5, phase: 0.2, lngJitter: 0.0001, latJitter: 0.0001, lngPeriod: 4, latPeriod: 4 },
      { id: 'jordan-labmate', name: 'Lab partner', point: shiftPoint(campus.library, -0.0002, 0.0001), baseWeight: 0.88, growth: 0.05, start: 0, end: 15, waveAmp: 0.03, wavePeriod: 4, phase: 0.7, lngJitter: 0.0001, latJitter: 0.0001, lngPeriod: 4, latPeriod: 4 },
      { id: 'jordan-team', name: 'Project team', point: shiftPoint(campus.plaza, 0.0001, -0.0001), baseWeight: 0.51, growth: 0.23, start: 1, end: 11, waveAmp: 0.06, wavePeriod: 4, phase: 1.1, lngJitter: 0.00012, latJitter: 0.0001, lngPeriod: 4, latPeriod: 4 },
      { id: 'jordan-friend', name: 'Cousin', point: shiftPoint(campus.cafe, 0.0002, 0.0003), baseWeight: 0.31, growth: 0.15, start: 5, end: 14, waveAmp: 0.08, wavePeriod: 5, phase: 0.5, lngJitter: 0.0001, latJitter: 0.00008, lngPeriod: 4, latPeriod: 4 },
    ],
  },
  {
    id: 'sofia',
    name: 'Sofia Alvarez',
    major: 'Psychology',
    year: 'Sophomore',
    bio: 'A socially active student whose circle dips during exams and rebounds through service orgs.',
    color: '#fbbf24',
    anchor: campus.studentCenter,
    phase: 1.7,
    mobilityBase: 5.2,
    mobilitySlope: 0.12,
    mobilityWave: 1.0,
    mobilityPeriod: 6,
    distanceBase: 4.9,
    distanceSlope: 0.18,
    distanceWave: 1.05,
    distancePeriod: 7,
    connectednessBase: 79,
    connectednessSlope: 0.1,
    connectednessWave: 7,
    connectednessPeriod: 4,
    radiusWave: 0.1,
    radiusPeriod: 5,
    walkLng: 0.0011,
    walkLat: 0.00075,
    walkPeriod: 5,
    places: [
      { id: 'sofia-center', name: 'Student center', point: campus.studentCenter, baseWeight: 1, growth: 0, start: 0, end: 15, waveAmp: 0.04, wavePeriod: 4, phase: 0.1, lngJitter: 0.0002, latJitter: 0.0002, lngPeriod: 4, latPeriod: 4 },
      { id: 'sofia-wellness', name: 'Wellness center', point: campus.wellness, baseWeight: 0.62, growth: 0.22, start: 1, end: 15, waveAmp: 0.08, wavePeriod: 4, phase: 0.8, lngJitter: 0.0002, latJitter: 0.00015, lngPeriod: 4, latPeriod: 4 },
      { id: 'sofia-arts', name: 'Arts building', point: campus.arts, baseWeight: 0.68, growth: 0.05, start: 0, end: 15, waveAmp: 0.04, wavePeriod: 5, phase: 1.1, lngJitter: 0.00015, latJitter: 0.00018, lngPeriod: 4, latPeriod: 4 },
      { id: 'sofia-club', name: 'Service org room', point: campus.clubRoom, baseWeight: 0.78, growth: -0.12, start: 0, end: 9, waveAmp: 0.06, wavePeriod: 3, phase: 0.2, lngJitter: 0.00012, latJitter: 0.00012, lngPeriod: 4, latPeriod: 4 },
      { id: 'sofia-cafe', name: 'Cafe', point: campus.cafe, baseWeight: 0.56, growth: 0.16, start: 3, end: 15, waveAmp: 0.07, wavePeriod: 4, phase: 0.9, lngJitter: 0.00012, latJitter: 0.00012, lngPeriod: 4, latPeriod: 4 },
    ],
    people: [
      { id: 'sofia-roommate', name: 'Roommate', point: shiftPoint(campus.studentCenter, 0.0003, -0.0002), baseWeight: 0.94, growth: 0.02, start: 0, end: 15, waveAmp: 0.02, wavePeriod: 4, phase: 0.2, lngJitter: 0.0001, latJitter: 0.0001, lngPeriod: 4, latPeriod: 4 },
      { id: 'sofia-service', name: 'Service squad', point: shiftPoint(campus.clubRoom, -0.0001, 0.0002), baseWeight: 0.84, growth: -0.1, start: 0, end: 9, waveAmp: 0.05, wavePeriod: 3, phase: 0.6, lngJitter: 0.0001, latJitter: 0.00008, lngPeriod: 4, latPeriod: 4 },
      { id: 'sofia-mentor', name: 'Mentor', point: shiftPoint(campus.arts, 0.0004, -0.0001), baseWeight: 0.55, growth: 0.16, start: 2, end: 12, waveAmp: 0.04, wavePeriod: 4, phase: 1.0, lngJitter: 0.0001, latJitter: 0.00008, lngPeriod: 4, latPeriod: 4 },
      { id: 'sofia-weekend', name: 'Weekend crew', point: shiftPoint(campus.friendApt, 0.0002, 0.0001), baseWeight: 0.42, growth: 0.21, start: 1, end: 7, waveAmp: 0.06, wavePeriod: 4, phase: 1.1, lngJitter: 0.0001, latJitter: 0.00008, lngPeriod: 4, latPeriod: 4 },
    ],
  },
  {
    id: 'eli',
    name: 'Eli Brooks',
    major: 'Business',
    year: 'Freshman',
    bio: 'Lower overall mobility than some peers, but with a steady, non-declining support circle.',
    color: '#f472b6',
    anchor: campus.dining,
    phase: 2.2,
    mobilityBase: 3.7,
    mobilitySlope: 0.16,
    mobilityWave: 1.15,
    mobilityPeriod: 5,
    distanceBase: 3.6,
    distanceSlope: 0.2,
    distanceWave: 1.1,
    distancePeriod: 5,
    connectednessBase: 62,
    connectednessSlope: 0.35,
    connectednessWave: 5,
    connectednessPeriod: 6,
    radiusWave: 0.09,
    radiusPeriod: 5,
    walkLng: 0.0009,
    walkLat: 0.00072,
    walkPeriod: 4,
    places: [
      { id: 'eli-dorm', name: 'Dorm', point: campus.dining, baseWeight: 1, growth: 0, start: 0, end: 15, waveAmp: 0.03, wavePeriod: 4, phase: 0.2, lngJitter: 0.0002, latJitter: 0.00015, lngPeriod: 4, latPeriod: 4 },
      { id: 'eli-plaza', name: 'Campus plaza', point: campus.plaza, baseWeight: 0.45, growth: 0.22, start: 2, end: 15, waveAmp: 0.07, wavePeriod: 4, phase: 0.7, lngJitter: 0.00015, latJitter: 0.00012, lngPeriod: 4, latPeriod: 4 },
      { id: 'eli-gym', name: 'Gym', point: campus.gym, baseWeight: 0.5, growth: 0.18, start: 3, end: 15, waveAmp: 0.06, wavePeriod: 5, phase: 1.2, lngJitter: 0.00015, latJitter: 0.00012, lngPeriod: 4, latPeriod: 4 },
      { id: 'eli-stadium', name: 'Stadium walk', point: campus.stadiumWalk, baseWeight: 0.28, growth: 0.26, start: 5, end: 15, waveAmp: 0.08, wavePeriod: 4, phase: 0.9, lngJitter: 0.0001, latJitter: 0.0001, lngPeriod: 4, latPeriod: 4 },
    ],
    people: [
      { id: 'eli-roommate', name: 'Roommate', point: shiftPoint(campus.dining, 0.0002, 0.0001), baseWeight: 0.91, growth: 0.02, start: 0, end: 15, waveAmp: 0.02, wavePeriod: 4, phase: 0.2, lngJitter: 0.00008, latJitter: 0.00008, lngPeriod: 4, latPeriod: 4 },
      { id: 'eli-orientation', name: 'Orientation crew', point: shiftPoint(campus.plaza, -0.0001, 0.0001), baseWeight: 0.64, growth: -0.02, start: 0, end: 6, waveAmp: 0.05, wavePeriod: 3, phase: 1.1, lngJitter: 0.00008, latJitter: 0.00008, lngPeriod: 4, latPeriod: 4 },
      { id: 'eli-teammate', name: 'Sports teammate', point: shiftPoint(campus.gym, 0.00015, -0.0001), baseWeight: 0.48, growth: 0.28, start: 4, end: 15, waveAmp: 0.07, wavePeriod: 4, phase: 0.7, lngJitter: 0.00008, latJitter: 0.00008, lngPeriod: 4, latPeriod: 4 },
      { id: 'eli-cafe', name: 'Cafe study group', point: shiftPoint(campus.cafe, 0.0001, 0.0001), baseWeight: 0.36, growth: 0.12, start: 6, end: 15, waveAmp: 0.05, wavePeriod: 5, phase: 1.3, lngJitter: 0.00008, latJitter: 0.00008, lngPeriod: 4, latPeriod: 4 },
    ],
  },
]

function buildStudentTimeline(def) {
  return Array.from({ length: WEEK_COUNT }, (_, week) => buildWeek(def, week))
}

export const students = studentDefs.map((def) => ({
  id: def.id,
  name: def.name,
  major: def.major,
  year: def.year,
  bio: def.bio,
  color: def.color,
  weeks: buildStudentTimeline(def),
}))

export const weeklyConnectedness = Array.from({ length: WEEK_COUNT }, (_, week) => {
  const total = students.reduce((sum, student) => sum + student.weeks[week].connectedness, 0)
  return Math.round(total / students.length)
})

export function getStudentById(studentId) {
  return students.find((student) => student.id === studentId) || students[0]
}

export function getWeekData(studentId, weekIndex) {
  const student = getStudentById(studentId)
  return student.weeks[clamp(weekIndex, 0, WEEK_COUNT - 1)]
}

export function getStudentMarkers(weekIndex, selectedStudentId = null) {
  const week = clamp(weekIndex, 0, WEEK_COUNT - 1)

  return students.map((student) => {
    const data = student.weeks[week]
    return {
      id: student.id,
      name: student.name,
      major: student.major,
      year: student.year,
      bio: student.bio,
      color: student.color,
      selected: student.id === selectedStudentId,
      distanceKm: data.distanceKm,
      connectedness: data.connectedness,
      socialRadiusKm: data.socialRadiusKm,
      activePlaces: data.activePlaces.length,
      activePeople: data.activePeople.length,
      geometry: {
        type: 'Point',
        coordinates: data.activityPoint,
      },
    }
  })
}

export { timelineWeeks }
