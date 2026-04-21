<template>
  <section class="panel map-panel">
    <div class="section-header">
      <div>
        <p class="eyebrow">Mapbox</p>
        <h2>{{ mode === 'choropleth' ? 'USC campus choropleth' : 'USC campus social circle' }}</h2>
        <p class="muted">
          <span v-if="mode === 'choropleth'">
            Campus zones are shaded by the current cohort’s average connectedness and visit density.
          </span>
          <span v-else>
            Student paths and social circles update by week. Campus venues stay on the map and light up when visited.
          </span>
        </p>
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
import { campusVenues } from '../data/uscSemester.js'

const props = defineProps({
  mode: { type: String, required: true },
  week: { type: Number, required: true },
  weekData: { type: Object, required: true },
  fullWeekData: { type: Object, required: true },
  studentMarkers: { type: Array, required: true },
  choroplethZones: { type: Array, required: true },
  token: { type: String, default: '' },
})

const emit = defineEmits(['select-student'])

const mapEl = ref(null)
const errorMessage = ref('')
let map = null
let popup = null

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

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

function featureCollection(features) {
  return {
    type: 'FeatureCollection',
    features,
  }
}

const selectedCircle = computed(() => {
  const { activityPoint, socialRadiusKm, activePlaces, activePeople, connectedness } = props.weekData
  const selectedStudent = props.studentMarkers.find((marker) => marker.selected)
  const riskTier = connectedness <= 45 ? 'higher' : connectedness <= 62 ? 'moderate' : 'lower'

  const features = [
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
        name: selectedStudent?.name || 'Selected student',
        major: selectedStudent?.major || '',
        year: selectedStudent?.year || '',
        connectedness,
        activePlaces: activePlaces.length,
        activePeople: activePeople.length,
        riskTier,
      },
      geometry: { type: 'Point', coordinates: activityPoint },
    },
    ...activePlaces.map((place) => ({
      type: 'Feature',
      properties: {
        kind: 'place',
        name: place.name,
        group: place.group,
        weight: place.weight,
      },
      geometry: { type: 'Point', coordinates: place.point },
    })),
    ...activePeople.map((person) => ({
      type: 'Feature',
      properties: {
        kind: 'person',
        name: person.name,
        group: person.group,
        weight: person.weight,
      },
      geometry: { type: 'Point', coordinates: person.point },
    })),
  ]

  return featureCollection(features)
})

const studentMarkersGeoJSON = computed(() =>
  featureCollection(
    props.studentMarkers.map((marker) => ({
      type: 'Feature',
      properties: {
        kind: 'student',
        id: marker.id,
        name: marker.name,
        major: marker.major,
        year: marker.year,
        connectedness: marker.connectedness,
        distanceKm: marker.distanceKm,
        activePeople: marker.activePeople,
        activePlaces: marker.activePlaces,
        socialRadiusKm: marker.socialRadiusKm,
        riskColor: marker.riskColor,
        riskTier: marker.riskTier,
        selected: marker.selected,
      },
      geometry: marker.geometry,
    })),
  ),
)

const venueMarkersGeoJSON = computed(() => {
  const visitedIds = new Set((props.fullWeekData.activePlaces || []).map((place) => place.venueId))

  return featureCollection(
    campusVenues.map((venue) => ({
      type: 'Feature',
      properties: {
        kind: 'venue',
        id: venue.id,
        name: venue.name,
        group: venue.group,
        visited: visitedIds.has(venue.id),
      },
      geometry: { type: 'Point', coordinates: venue.point },
    })),
  )
})

const zoneGeoJSON = computed(() =>
  featureCollection(
    props.choroplethZones.map((zone) => ({
      type: 'Feature',
      properties: {
        kind: 'zone',
        id: zone.id,
        name: zone.name,
        group: zone.group,
        score: zone.score,
        visits: zone.visits,
        students: zone.students,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [zone.coordinates],
      },
    })),
  ),
)

function popupContent(feature) {
  const kind = feature?.properties?.kind

  if (kind === 'student') {
    const { name, major, year, connectedness, activePlaces, activePeople, riskTier } = feature.properties
    return `
      <div>
        <strong>${escapeHtml(name)}</strong><br/>
        ${escapeHtml(year)} · ${escapeHtml(major)}<br/>
        Connectedness: ${escapeHtml(connectedness)}<br/>
        Places: ${escapeHtml(activePlaces)} · People: ${escapeHtml(activePeople)}<br/>
        Signal: ${escapeHtml(riskTier)}
      </div>
    `
  }

  if (kind === 'venue') {
    return `
      <div>
        <strong>${escapeHtml(feature.properties.name)}</strong><br/>
        Group: ${escapeHtml(feature.properties.group)}<br/>
        Visited this week: ${feature.properties.visited ? 'yes' : 'no'}
      </div>
    `
  }

  if (kind === 'zone') {
    return `
      <div>
        <strong>${escapeHtml(feature.properties.name)}</strong><br/>
        Average score: ${escapeHtml(feature.properties.score)}<br/>
        Matching students: ${escapeHtml(feature.properties.students)}<br/>
        Total visits: ${escapeHtml(feature.properties.visits)}
      </div>
    `
  }

  if (kind === 'place' || kind === 'person') {
    return `
      <div>
        <strong>${escapeHtml(feature.properties.name)}</strong><br/>
        Group: ${escapeHtml(feature.properties.group)}
      </div>
    `
  }

  return `<div><strong>${escapeHtml(feature?.properties?.name || 'Location')}</strong></div>`
}

function setPopup(feature, coordinates) {
  if (!popup) return
  popup
    .setLngLat(coordinates)
    .setHTML(popupContent(feature))
    .addTo(map)
}

function syncSources() {
  if (!map) return
  const socialSource = map.getSource('social')
  const studentsSource = map.getSource('students')
  const venuesSource = map.getSource('venues')
  const zonesSource = map.getSource('zones')

  if (socialSource) socialSource.setData(selectedCircle.value)
  if (studentsSource) studentsSource.setData(studentMarkersGeoJSON.value)
  if (venuesSource) venuesSource.setData(venueMarkersGeoJSON.value)
  if (zonesSource) zonesSource.setData(zoneGeoJSON.value)
}

function syncMode() {
  if (!map) return
  const choropleth = props.mode === 'choropleth'
  const show = (layerId) => {
    if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', 'visible')
  }
  const hide = (layerId) => {
    if (map.getLayer('selected-student')) map.setLayoutProperty('selected-student', 'visibility', 'none')
    if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', 'none')
  }

  ;['zone-fill', 'zone-outline', 'zone-labels'].forEach(choropleth ? show : hide)
  ;['radius-fill', 'place-points', 'person-points', 'venue-base', 'venues-visited', 'venue-labels', 'student-labels', 'students-other'].forEach(choropleth ? hide : show)
  // Keep selected student hidden/showed in lockstep with the student layers.
  if (map.getLayer('students-selected')) {
    map.setLayoutProperty('students-selected', 'visibility', choropleth ? 'none' : 'visible')
  }
}

onMounted(() => {
  try {
    const accessToken = props.token?.trim()
    if (!accessToken) {
      errorMessage.value = 'Mapbox token is missing. Add VITE_MAPBOX_TOKEN to your environment and restart Vite.'
      return
    }

    mapboxgl.accessToken = accessToken
    map = new mapboxgl.Map({
      container: mapEl.value,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-118.2851, 34.0206],
      zoom: 15.2,
      pitch: 32,
      bearing: -12,
      attributionControl: false,
    })

    popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 12 })

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right')

    map.on('error', (event) => {
      if (!errorMessage.value) {
        errorMessage.value = event?.error?.message || 'Mapbox failed to load.'
      }
    })

    map.on('load', () => {
      map.addSource('social', { type: 'geojson', data: selectedCircle.value })
      map.addSource('students', { type: 'geojson', data: studentMarkersGeoJSON.value })
      map.addSource('venues', { type: 'geojson', data: venueMarkersGeoJSON.value })
      map.addSource('zones', { type: 'geojson', data: zoneGeoJSON.value })

      map.addLayer({
        id: 'zone-fill',
        type: 'fill',
        source: 'zones',
        paint: {
          'fill-color': [
            'interpolate',
            ['linear'],
            ['get', 'score'],
            0, '#7f1d1d',
            35, '#f97316',
            55, '#f59e0b',
            75, '#84cc16',
            100, '#16a34a',
          ],
          'fill-opacity': 0.55,
        },
      })

      map.addLayer({
        id: 'zone-outline',
        type: 'line',
        source: 'zones',
        paint: {
          'line-color': '#f8fafc',
          'line-width': 1.1,
          'line-opacity': 0.24,
        },
      })

      map.addLayer({
        id: 'zone-labels',
        type: 'symbol',
        source: 'zones',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 11,
          'text-offset': [0, 0],
          'text-anchor': 'center',
        },
        paint: {
          'text-color': '#f8fafc',
          'text-halo-color': '#0b1220',
          'text-halo-width': 1.2,
        },
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
          'circle-color': [
            'case',
            ['==', ['get', 'riskTier'], 'higher'], '#ef4444',
            ['==', ['get', 'riskTier'], 'moderate'], '#f59e0b',
            '#22c55e',
          ],
          'circle-radius': ['interpolate', ['linear'], ['get', 'connectedness'], 0, 10, 100, 18],
          'circle-stroke-width': 3,
          'circle-stroke-color': '#eef6ff',
        },
      })

      map.addLayer({
        id: 'venue-base',
        type: 'circle',
        source: 'venues',
        paint: {
          'circle-color': '#334155',
          'circle-radius': 6,
          'circle-opacity': 0.72,
          'circle-stroke-color': '#94a3b8',
          'circle-stroke-width': 1,
        },
      })

      map.addLayer({
        id: 'venues-visited',
        type: 'circle',
        source: 'venues',
        filter: ['==', ['get', 'visited'], true],
        paint: {
          'circle-color': [
            'match',
            ['get', 'group'],
            'academic', '#8b5cf6',
            'housing', '#38bdf8',
            'social', '#60a5fa',
            'clubs', '#22c55e',
            'dining', '#f59e0b',
            'wellness', '#ec4899',
            'athletics', '#14b8a6',
            '#cbd5e1',
          ],
          'circle-radius': 10,
          'circle-opacity': 0.96,
          'circle-stroke-color': '#f8fafc',
          'circle-stroke-width': 2,
        },
      })

      map.addLayer({
        id: 'venue-labels',
        type: 'symbol',
        source: 'venues',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 11,
          'text-offset': [0, 1.15],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': [
            'case',
            ['==', ['get', 'visited'], true], '#f8fafc',
            '#cbd5e1',
          ],
          'text-halo-color': '#08101d',
          'text-halo-width': 1.2,
        },
      })

      map.addLayer({
        id: 'students-other',
        type: 'circle',
        source: 'students',
        filter: ['==', ['get', 'selected'], false],
        paint: {
          'circle-color': ['get', 'riskColor'],
          'circle-radius': ['interpolate', ['linear'], ['get', 'connectedness'], 0, 8, 100, 13],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#0b1220',
          'circle-opacity': 0.92,
        },
      })

      map.addLayer({
        id: 'students-selected',
        type: 'circle',
        source: 'students',
        filter: ['==', ['get', 'selected'], true],
        paint: {
          'circle-color': ['get', 'riskColor'],
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

      const hoverLayers = [
        'zone-fill',
        'students-other',
        'students-selected',
        'venue-base',
        'venues-visited',
        'place-points',
        'person-points',
      ]

      hoverLayers.forEach((layerId) => {
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

      map.on('click', 'venue-base', (event) => {
        const feature = event.features?.[0]
        if (!feature) return
        setPopup(feature, feature.geometry.coordinates)
      })

      map.on('click', 'venues-visited', (event) => {
        const feature = event.features?.[0]
        if (!feature) return
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

      map.on('click', 'zone-fill', (event) => {
        const feature = event.features?.[0]
        if (!feature) return
        setPopup(feature, event.lngLat)
      })

      syncSources()
      syncMode()
    })
  } catch (error) {
    errorMessage.value = error?.message || 'Unexpected Mapbox initialization error.'
  }
})

watch(
  () => [props.week, props.weekData, props.fullWeekData, props.studentMarkers, props.choroplethZones],
  syncSources,
  { deep: true },
)

watch(() => props.mode, syncMode)

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
  border-radius: 20px;
  border: 1px solid rgba(248, 113, 113, 0.35);
  background: rgba(127, 29, 29, 0.25);
  color: #fecaca;
  text-align: center;
  line-height: 1.5;
}
</style>
