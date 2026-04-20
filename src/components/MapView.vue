<template>
  <section class="panel map-panel">
    <div class="section-header">
      <div>
        <p class="eyebrow">Mapbox</p>
        <h2>USC social circle map</h2>
        <p class="muted">Click a student marker to switch whose week is shown.</p>
      </div>
      <div class="metric">Week {{ week + 1 }}</div>
    </div>

    <div v-if="errorMessage" class="map-error">
      {{ errorMessage }}
    </div>

    <div v-else ref="mapEl" class="map"></div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import mapboxgl from 'mapbox-gl'

const props = defineProps({
  week: { type: Number, required: true },
  weekData: { type: Object, required: true },
  studentMarkers: { type: Array, required: true },
  token: { type: String, default: '' },
})

const emit = defineEmits(['select-student'])

const mapEl = ref(null)
const errorMessage = ref('')
let map = null
let popup = null

const socialData = computed(() => {
  const { student, socialRadiusKm, activePlaces, activePeople } = props.weekData

  const features = [
    {
      type: 'Feature',
      properties: { kind: 'radius' },
      geometry: {
        type: 'Polygon',
        coordinates: [circlePolygon(student[0], student[1], socialRadiusKm, 60)],
      },
    },
    {
      type: 'Feature',
      properties: { kind: 'student' },
      geometry: { type: 'Point', coordinates: student },
    },
    ...activePlaces.map((place) => ({
      type: 'Feature',
      properties: { kind: 'place', name: place.name, weight: place.weight },
      geometry: { type: 'Point', coordinates: place.point },
    })),
    ...activePeople.map((person) => ({
      type: 'Feature',
      properties: { kind: 'person', name: person.name, weight: person.weight },
      geometry: { type: 'Point', coordinates: person.point },
    })),
  ]

  return { type: 'FeatureCollection', features }
})

const studentData = computed(() => ({
  type: 'FeatureCollection',
  features: props.studentMarkers.map((student) => ({
    type: 'Feature',
    properties: {
      id: student.id,
      name: student.name,
      major: student.major,
      year: student.year,
      bio: student.bio,
      color: student.color,
      selected: student.selected,
      connectedness: student.connectedness,
    },
    geometry: {
      type: 'Point',
      coordinates: student.point,
    },
  })),
}))

function circlePolygon(lng, lat, radiusKm, steps = 64) {
  const coords = []
  const earthRadius = 6371
  const d = radiusKm / earthRadius
  const lat1 = (lat * Math.PI) / 180
  const lng1 = (lng * Math.PI) / 180

  for (let i = 0; i <= steps; i += 1) {
    const bearing = (i / steps) * 2 * Math.PI
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(bearing),
    )
    const lng2 =
      lng1 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(d) * Math.cos(lat1),
        Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
      )
    coords.push([(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI])
  }
  return coords
}

function syncData() {
  if (!map) return
  const socialSource = map.getSource('social')
  const studentSource = map.getSource('students')
  if (socialSource) socialSource.setData(socialData.value)
  if (studentSource) studentSource.setData(studentData.value)
}

function openStudentPopup(feature, lngLat) {
  if (!popup) return
  popup
    .setLngLat(lngLat)
    .setHTML(`
      <div style="min-width: 180px; font-family: Inter, sans-serif;">
        <div style="font-weight: 700; margin-bottom: 4px;">${feature.properties.name}</div>
        <div style="opacity: 0.78; margin-bottom: 6px;">${feature.properties.major} · ${feature.properties.year}</div>
        <div style="font-size: 12px; opacity: 0.85; line-height: 1.4;">${feature.properties.bio}</div>
      </div>
    `)
    .addTo(map)
}

onMounted(() => {
  const accessToken = props.token?.trim()
  if (!accessToken) {
    errorMessage.value = 'Mapbox token is missing. Add VITE_MAPBOX_TOKEN to .env.local and restart Vite.'
    return
  }

  mapboxgl.accessToken = accessToken
  popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false })

  try {
    map = new mapboxgl.Map({
      container: mapEl.value,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-118.2851, 34.0206],
      zoom: 15.2,
      pitch: 35,
      bearing: -18,
      attributionControl: false,
    })
  } catch (error) {
    errorMessage.value = error?.message || 'Failed to initialize the map.'
    return
  }

  map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right')

  map.on('error', (event) => {
    if (!errorMessage.value) {
      errorMessage.value = event?.error?.message || 'Mapbox failed to load.'
    }
  })

  map.on('load', () => {
    map.addSource('social', {
      type: 'geojson',
      data: socialData.value,
    })

    map.addSource('students', {
      type: 'geojson',
      data: studentData.value,
    })

    map.addLayer({
      id: 'radius',
      type: 'fill',
      source: 'social',
      filter: ['==', ['get', 'kind'], 'radius'],
      paint: {
        'fill-color': '#7dd3fc',
        'fill-opacity': 0.12,
      },
    })

    map.addLayer({
      id: 'place-points',
      type: 'circle',
      source: 'social',
      filter: ['==', ['get', 'kind'], 'place'],
      paint: {
        'circle-color': '#c4b5fd',
        'circle-radius': ['interpolate', ['linear'], ['get', 'weight'], 0.3, 5, 1, 15],
        'circle-opacity': 0.92,
      },
    })

    map.addLayer({
      id: 'person-points',
      type: 'circle',
      source: 'social',
      filter: ['==', ['get', 'kind'], 'person'],
      paint: {
        'circle-color': '#86efac',
        'circle-radius': ['interpolate', ['linear'], ['get', 'weight'], 0.3, 6, 1, 16],
        'circle-opacity': 0.95,
      },
    })

    map.addLayer({
      id: 'student-point',
      type: 'circle',
      source: 'social',
      filter: ['==', ['get', 'kind'], 'student'],
      paint: {
        'circle-color': '#9ed0ff',
        'circle-radius': 11,
        'circle-stroke-width': 3,
        'circle-stroke-color': '#eef6ff',
      },
    })

    map.addLayer({
      id: 'student-others',
      type: 'circle',
      source: 'students',
      filter: ['==', ['get', 'selected'], false],
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': 10,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#0b1220',
        'circle-opacity': 0.88,
      },
    })

    map.addLayer({
      id: 'student-selected',
      type: 'circle',
      source: 'students',
      filter: ['==', ['get', 'selected'], true],
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': 15,
        'circle-stroke-width': 4,
        'circle-stroke-color': '#f8fafc',
        'circle-opacity': 1,
      },
    })

    map.addLayer({
      id: 'student-labels',
      type: 'symbol',
      source: 'students',
      layout: {
        'text-field': ['get', 'name'],
        'text-size': 12,
        'text-offset': [0, 1.3],
        'text-anchor': 'top',
      },
      paint: {
        'text-color': '#ecf6ff',
        'text-halo-color': '#08101d',
        'text-halo-width': 1.2,
      },
    })

    const hoverLayers = ['student-selected', 'student-others', 'place-points', 'person-points']
    hoverLayers.forEach((layerId) => {
      map.on('mouseenter', layerId, () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = ''
        popup.remove()
      })
    })

    map.on('mousemove', 'student-others', (event) => {
      const feature = event.features?.[0]
      if (!feature) return
      openStudentPopup(feature, feature.geometry.coordinates)
    })

    map.on('mousemove', 'student-selected', (event) => {
      const feature = event.features?.[0]
      if (!feature) return
      openStudentPopup(feature, feature.geometry.coordinates)
    })

    map.on('click', 'student-others', (event) => {
      const feature = event.features?.[0]
      if (feature?.properties?.id) emit('select-student', feature.properties.id)
    })

    map.on('click', 'student-selected', (event) => {
      const feature = event.features?.[0]
      if (feature?.properties?.id) emit('select-student', feature.properties.id)
    })

    syncData()
  })
})

watch(() => [props.weekData, props.studentMarkers], syncData, { deep: true })

onBeforeUnmount(() => {
  if (popup) popup.remove()
  if (map) map.remove()
})
</script>

<style scoped>
.map-panel { padding: 18px; }
.map { width: 100%; min-height: 560px; border-radius: 16px; overflow: hidden; background: rgba(255,255,255,0.04); }
.map-error { min-height: 200px; display: grid; place-items: center; padding: 20px; border-radius: 16px; border: 1px solid rgba(248,113,113,0.35); background: rgba(127,29,29,0.25); color: #fecaca; text-align: center; line-height: 1.5; }
.muted { margin: 8px 0 0; color: #8ea3bf; }
</style>
