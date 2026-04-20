<template>
  <section class="panel map-panel">
    <div class="section-header">
      <div>
        <p class="eyebrow">Mapbox</p>
        <h2>USC campus social circle</h2>
        <p class="muted">Select a student on the map or from the roster to inspect their synthetic activity story.</p>
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

const selectedCircle = computed(() => {
  const { activityPoint, socialRadiusKm, activePlaces, activePeople } = props.weekData

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { kind: 'radius' },
        geometry: {
          type: 'Polygon',
          coordinates: [circlePolygon(activityPoint[0], activityPoint[1], socialRadiusKm, 72)],
        },
      },
      {
        type: 'Feature',
        properties: {
          kind: 'student',
          name: props.selectedStudentName,
          major: props.selectedStudentMajor,
          year: props.selectedStudentYear,
          bio: props.selectedStudentBio,
          distanceKm: props.weekData.distanceKm,
          connectedness: props.weekData.connectedness,
          activePlaces: activePlaces.length,
          activePeople: activePeople.length,
        },
        geometry: { type: 'Point', coordinates: activityPoint },
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
    ],
  }
})
const studentMarkersGeoJSON = computed(() => ({
  type: 'FeatureCollection',
  features: props.studentMarkers.map((student) => ({
    type: 'Feature',
    properties: student,
    geometry: student.geometry,
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

function setPopup(feature, coordinates) {
  const props = feature.properties || {}
  const color = props.color || '#9ed0ff'

  if (!popup) return

  popup
    .setLngLat(coordinates)
    .setHTML(`
      <div style="min-width: 200px; color: #e5eefb;">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
          <span style="width:10px; height:10px; border-radius:999px; background:${color}; display:inline-block;"></span>
          <strong>${props.name || 'Student'}</strong>
        </div>
        <div style="font-size: 12px; opacity: 0.82; margin-bottom: 6px;">${props.major || ''}${props.year ? ' · ' + props.year : ''}</div>
        <div style="font-size: 12px; opacity: 0.88; line-height: 1.4;">${props.bio || ''}</div>
        <div style="font-size: 12px; opacity: 0.8; margin-top: 8px; line-height: 1.5;">
          Distance: ${Number(props.distanceKm || 0).toFixed(1)} km<br />
          Connectedness: ${props.connectedness ?? '—'}/100<br />
          Active places: ${props.activePlaces ?? '—'}<br />
          Active people: ${props.activePeople ?? '—'}
        </div>
      </div>
    `)
    .addTo(map)
}

function syncSources() {
  if (!map) return
  const socialSource = map.getSource('social')
  const studentsSource = map.getSource('students')
  if (socialSource) socialSource.setData(selectedCircle.value)
  if (studentsSource) studentsSource.setData(studentMarkersGeoJSON.value)
}

onMounted(() => {
  const accessToken = props.token?.trim()
  if (!accessToken) {
    errorMessage.value = 'Mapbox token is missing. Add VITE_MAPBOX_TOKEN to your environment and restart Vite.'
    return
  }

  mapboxgl.accessToken = accessToken
  popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false })

  try {
    map = new mapboxgl.Map({
      container: mapEl.value,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-118.2851, 34.0206],
      zoom: 15.15,
      pitch: 35,
      bearing: -16,
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
      data: selectedCircle.value,
    })

    map.addSource('students', {
      type: 'geojson',
      data: studentMarkersGeoJSON.value,
    })

    map.addLayer({
      id: 'radius-fill',
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
        'circle-radius': ['interpolate', ['linear'], ['get', 'weight'], 0.2, 5, 1, 16],
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
        'circle-radius': ['interpolate', ['linear'], ['get', 'weight'], 0.2, 6, 1, 16],
        'circle-opacity': 0.95,
      },
    })

    map.addLayer({
      id: 'selected-student',
      type: 'circle',
      source: 'social',
      filter: ['==', ['get', 'kind'], 'student'],
      paint: {
        'circle-color': '#9ed0ff',
        'circle-radius': ['interpolate', ['linear'], ['get', 'connectedness'], 0, 10, 100, 16],
        'circle-stroke-width': 3,
        'circle-stroke-color': '#eef6ff',
      },
    })

    map.addLayer({
      id: 'students-other',
      type: 'circle',
      source: 'students',
      filter: ['==', ['get', 'selected'], false],
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': ['interpolate', ['linear'], ['get', 'connectedness'], 0, 8, 100, 13],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#0b1220',
        'circle-opacity': 0.9,
      },
    })

    map.addLayer({
      id: 'students-selected',
      type: 'circle',
      source: 'students',
      filter: ['==', ['get', 'selected'], true],
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': ['interpolate', ['linear'], ['get', 'connectedness'], 0, 12, 100, 18],
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
        'text-offset': [0, 1.2],
        'text-anchor': 'top',
      },
      paint: {
        'text-color': '#ecf6ff',
        'text-halo-color': '#08101d',
        'text-halo-width': 1.2,
      },
    })

    const clickableLayers = ['students-other', 'students-selected', 'place-points', 'person-points']
    clickableLayers.forEach((layerId) => {
      map.on('mouseenter', layerId, () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = ''
        if (popup) popup.remove()
      })
    })

    map.on('click', 'students-other', (event) => {
      const feature = event.features?.[0]
      if (!feature) return
      emit('select-student', feature.properties.id)
      setPopup(feature, feature.geometry.coordinates)
    })

    map.on('click', 'students-selected', (event) => {
      const feature = event.features?.[0]
      if (!feature) return
      emit('select-student', feature.properties.id)
      setPopup(feature, feature.geometry.coordinates)
    })

    map.on('click', 'place-points', (event) => {
      const feature = event.features?.[0]
      if (!feature) return
      setPopup(feature, feature.geometry.coordinates)
    })

    map.on('click', 'person-points', (event) => {
      const feature = event.features?.[0]
      if (!feature) return
      setPopup(feature, feature.geometry.coordinates)
    })

    syncSources()
  })
})

watch(() => props.weekData, syncSources, { deep: true })
watch(() => props.studentMarkers, syncSources, { deep: true })

onBeforeUnmount(() => {
  if (popup) popup.remove()
  if (map) map.remove()
})
</script>

<style scoped>
.map-panel {
  padding: 18px;
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
  background: rgba(255, 255, 255, 0.06);
  color: #d8e7fb;
  font-size: 13px;
  white-space: nowrap;
}

.map {
  width: 100%;
  min-height: 560px;
  border-radius: 20px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.04);
}

.map-error {
  min-height: 220px;
  display: grid;
  place-items: center;
  padding: 20px;
  border-radius: 16px;
  border: 1px solid rgba(248, 113, 113, 0.35);
  background: rgba(127, 29, 29, 0.25);
  color: #fecaca;
  text-align: center;
  line-height: 1.5;
}
</style>
