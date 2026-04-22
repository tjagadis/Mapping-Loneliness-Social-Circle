<template>
  <section class="panel map-panel">
    <div class="section-header">
      <div>
        <p class="eyebrow">Mapbox</p>
        <h2>{{ title }}</h2>
        <p class="muted">
          {{ subtitle }}
        </p>
      </div>
      <div class="metric">Week {{ week + 1 }}</div>
    </div>

    <div v-if="errorMessage" class="map-error">
      {{ errorMessage }}
    </div>

    <div v-else class="map-stage">
      <div ref="mapEl" class="map"></div>

      <div v-if="selectedMarker" class="mini-popup panel">
        <div class="mini-popup-header">
          <div>
            <p class="eyebrow">Selected student</p>
            <strong>{{ selectedMarker.name }}</strong>
            <div class="mini-popup-sub">{{ selectedMarker.year }} · {{ selectedMarker.major }}</div>
          </div>
          <div class="mini-popup-chip">{{ selectedMarker.riskTier }}</div>
        </div>

        <svg viewBox="0 0 240 180" class="mini-network" role="img" :aria-label="`${selectedMarker.name} social circle preview`">
          <line
            v-for="link in miniNetwork.links"
            :key="link.id"
            :x1="link.x1"
            :y1="link.y1"
            :x2="link.x2"
            :y2="link.y2"
            :class="['mini-link', link.kind]"
          />

          <g v-for="node in miniNetwork.nodes" :key="node.id">
            <circle :cx="node.x" :cy="node.y" :r="node.r" :class="['mini-node', node.kind]" />
            <text :x="node.x + 8" :y="node.y - 8" class="mini-label">{{ node.label }}</text>
          </g>

          <circle :cx="miniNetwork.center.x" :cy="miniNetwork.center.y" :r="miniNetwork.radiusPx" class="mini-radius" />
          <circle :cx="miniNetwork.center.x" :cy="miniNetwork.center.y" r="14" class="mini-center" />
          <text :x="miniNetwork.center.x + 18" :y="miniNetwork.center.y + 5" class="mini-center-label">{{ selectedMarker.name }}</text>
        </svg>

        <div class="mini-popup-footer">
          <span>{{ selectedMarker.connectedness }}/100 connectedness</span>
          <span>{{ selectedMarker.activePeople }} people</span>
          <span>{{ selectedMarker.activePlaces }} places</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import mapboxgl from 'mapbox-gl'
import { campusVenues } from '../data/uscSemester.js'

const ZOOM_CHORO_FADE_START = 13.25
const ZOOM_CHORO_FADE_END = 14.65
const ZOOM_POINTS_FADE_START = 13.85
const ZOOM_POINTS_FADE_END = 15.05
const ZOOM_NETWORK_FADE_START = 15.45
const ZOOM_NETWORK_FADE_END = 16.25

const props = defineProps({
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
const currentZoom = ref(13.35)
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

const selectedMarker = computed(() => props.studentMarkers.find((marker) => marker.selected) || null)
function lerp(a, b, t) {
  return a + (b - a) * t
}

function mapRange(value, inMin, inMax, outMin, outMax) {
  if (inMax === inMin) return outMin
  const t = Math.max(0, Math.min(1, (value - inMin) / (inMax - inMin)))
  return lerp(outMin, outMax, t)
}



const selectedCircle = computed(() => {
  if (!selectedMarker.value) {
    return featureCollection([])
  }

  const { activityPoint, socialRadiusKm, activePlaces, activePeople, connectedness } = props.weekData
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
        name: selectedMarker.value.name,
        major: selectedMarker.value.major,
        year: selectedMarker.value.year,
        connectedness,
        activePlaces: activePlaces.length,
        activePeople: activePeople.length,
        riskTier,
      },
      geometry: { type: 'Point', coordinates: activityPoint },
    },
    ...activePlaces.flatMap((place) => ([
      {
        type: 'Feature',
        properties: { kind: 'link', linkType: 'place', name: place.name },
        geometry: { type: 'LineString', coordinates: [activityPoint, place.point] },
      },
      {
        type: 'Feature',
        properties: { kind: 'place', name: place.name, group: place.group, weight: place.weight },
        geometry: { type: 'Point', coordinates: place.point },
      },
    ])),
    ...activePeople.flatMap((person) => ([
      {
        type: 'Feature',
        properties: { kind: 'link', linkType: 'person', name: person.name },
        geometry: { type: 'LineString', coordinates: [activityPoint, person.point] },
      },
      {
        type: 'Feature',
        properties: { kind: 'person', name: person.name, group: person.group, weight: person.weight },
        geometry: { type: 'Point', coordinates: person.point },
      },
    ])),
  ]

  return featureCollection(features)
})

const miniNetwork = computed(() => {
  const centerFeature = selectedCircle.value.features.find((feature) => feature.properties?.kind === 'student')
  const pointFeatures = selectedCircle.value.features.filter((feature) => ['student', 'place', 'person'].includes(feature.properties?.kind))
  const linkFeatures = selectedCircle.value.features.filter((feature) => feature.properties?.kind === 'link')

  const points = pointFeatures.map((feature) => feature.geometry.coordinates)
  if (points.length === 0) {
    return {
      center: { x: 120, y: 90 },
      nodes: [],
      links: [],
    }
  }

  const lngs = points.map(([lng]) => lng)
  const lats = points.map(([, lat]) => lat)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const padX = 26
  const padY = 24
  const width = 188
  const height = 132

  const toXY = ([lng, lat]) => ({
    x: padX + mapRange(lng, minLng, maxLng, 0, width),
    y: padY + mapRange(lat, maxLat, minLat, 0, height),
  })

  const nodes = pointFeatures.map((feature) => {
    const xy = toXY(feature.geometry.coordinates)
    const kind = feature.properties.kind === 'student' ? 'student' : feature.properties.kind
    const label = feature.properties.name
    const r = kind === 'student' ? 11 : kind === 'person' ? 7 : 6
    return {
      id: `${feature.properties.kind}-${label}`,
      kind,
      label,
      x: xy.x,
      y: xy.y,
      r,
    }
  })

  const studentNode = nodes.find((node) => node.kind === 'student') || { x: 120, y: 90 }

  const links = linkFeatures.map((feature, index) => {
    const endPoint = feature.geometry.coordinates[1]
    const xy = toXY(endPoint)
    return {
      id: `${feature.properties.linkType}-${index}`,
      kind: feature.properties.linkType,
      x1: studentNode.x,
      y1: studentNode.y,
      x2: xy.x,
      y2: xy.y,
    }
  })

  return {
    center: studentNode,
    nodes,
    links,
    radiusPx: mapRange(props.weekData.socialRadiusKm, 0.4, 3.4, 24, 58),
  }
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

const stage = computed(() => {
  if (currentZoom.value < ZOOM_POINTS_FADE_START) return 'choropleth'
  if (currentZoom.value < ZOOM_NETWORK_FADE_START) return 'dots'
  return 'network'
})

const title = computed(() => {
  if (stage.value === 'choropleth') return 'USC campus choropleth'
  if (stage.value === 'dots') return 'USC campus dot plot'
  return 'USC campus social network'
})

const subtitle = computed(() => {
  if (stage.value === 'choropleth') {
    return 'Zoom in to reveal student points and venue activity.'
  }
  if (stage.value === 'dots') {
    return 'Student points and venues are visible. Zoom further to reveal the selected student’s network.'
  }
  return 'The selected student’s places, people, and social radius are revealed at close range.'
})

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

function setVisibility(layerId, visible) {
  if (!map?.getLayer(layerId)) return
  map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')
}

function syncZoomStyles() {
  if (!map) return
  const z = currentZoom.value

  const zoneFillOpacity = mapRange(z, ZOOM_CHORO_FADE_START, ZOOM_CHORO_FADE_END, 0.58, 0.05)
  const zoneLineOpacity = mapRange(z, ZOOM_CHORO_FADE_START, ZOOM_CHORO_FADE_END, 0.24, 0.02)
  const zoneLabelOpacity = mapRange(z, ZOOM_CHORO_FADE_START, ZOOM_CHORO_FADE_END - 0.3, 1, 0)

  const dotOpacity = mapRange(z, ZOOM_POINTS_FADE_START, ZOOM_POINTS_FADE_END, 0, 0.92)
  const dotRadius = mapRange(z, ZOOM_POINTS_FADE_START, ZOOM_POINTS_FADE_END, 2, 13)
  const venueVisitedRadius = mapRange(z, ZOOM_POINTS_FADE_START, ZOOM_POINTS_FADE_END, 4, 10)
  const venueBaseOpacity = mapRange(z, ZOOM_POINTS_FADE_START, ZOOM_POINTS_FADE_END, 0, 0.72)
  const venueLabelOpacity = mapRange(z, ZOOM_POINTS_FADE_START, ZOOM_POINTS_FADE_END, 0, 1)

  const networkOpacity = mapRange(z, ZOOM_NETWORK_FADE_START, ZOOM_NETWORK_FADE_END, 0, 1)
  const networkRadiusOpacity = mapRange(z, ZOOM_NETWORK_FADE_START, ZOOM_NETWORK_FADE_END, 0, 0.14)
  const networkRadius = mapRange(z, ZOOM_NETWORK_FADE_START, ZOOM_NETWORK_FADE_END, 0, 20)

  if (map.getLayer('zone-fill')) map.setPaintProperty('zone-fill', 'fill-opacity', zoneFillOpacity)
  if (map.getLayer('zone-outline')) map.setPaintProperty('zone-outline', 'line-opacity', zoneLineOpacity)
  if (map.getLayer('zone-labels')) map.setPaintProperty('zone-labels', 'text-opacity', zoneLabelOpacity)

  if (map.getLayer('student-points')) {
    map.setPaintProperty('student-points', 'circle-opacity', dotOpacity)
    map.setPaintProperty('student-points', 'circle-radius', dotRadius)
  }
  if (map.getLayer('student-labels')) map.setPaintProperty('student-labels', 'text-opacity', dotOpacity)

  if (map.getLayer('venue-base')) {
    map.setPaintProperty('venue-base', 'circle-opacity', venueBaseOpacity)
    map.setPaintProperty('venue-base', 'circle-radius', mapRange(z, ZOOM_POINTS_FADE_START, ZOOM_POINTS_FADE_END, 4, 6))
  }
  if (map.getLayer('venues-visited')) {
    map.setPaintProperty('venues-visited', 'circle-opacity', venueBaseOpacity)
    map.setPaintProperty('venues-visited', 'circle-radius', venueVisitedRadius)
  }
  if (map.getLayer('venue-labels')) map.setPaintProperty('venue-labels', 'text-opacity', venueLabelOpacity)

  if (map.getLayer('social-radius')) map.setPaintProperty('social-radius', 'fill-opacity', networkRadiusOpacity)
  if (map.getLayer('selected-place-points')) map.setPaintProperty('selected-place-points', 'circle-opacity', networkOpacity)
  if (map.getLayer('selected-person-points')) map.setPaintProperty('selected-person-points', 'circle-opacity', networkOpacity)
  if (map.getLayer('selected-student-center')) {
    map.setPaintProperty('selected-student-center', 'circle-opacity', networkOpacity)
    map.setPaintProperty('selected-student-center', 'circle-radius', networkRadius)
  }
  if (map.getLayer('selected-links')) map.setPaintProperty('selected-links', 'line-opacity', networkOpacity)
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
      zoom: 13.05,
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

    map.on('zoom', () => {
      currentZoom.value = map.getZoom()
      syncZoomStyles()
    })

    map.on('moveend', () => {
      currentZoom.value = map.getZoom()
      syncZoomStyles()
    })

    map.on('load', () => {
      currentZoom.value = map.getZoom()

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
        id: 'student-points',
        type: 'circle',
        source: 'students',
        paint: {
          'circle-color': ['get', 'riskColor'],
          'circle-radius': ['interpolate', ['linear'], ['get', 'connectedness'], 0, 8, 100, 13],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#0b1220',
          'circle-opacity': 0.92,
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
        id: 'selected-student-center',
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
          'circle-radius': ['interpolate', ['linear'], ['get', 'connectedness'], 0, 12, 100, 18],
          'circle-stroke-width': 4,
          'circle-stroke-color': '#f8fafc',
        },
      })

      map.addLayer({
        id: 'selected-links',
        type: 'line',
        source: 'social',
        filter: ['==', ['get', 'kind'], 'link'],
        paint: {
          'line-color': '#9ed0ff',
          'line-width': 2.2,
          'line-opacity': 0.85,
        },
      })

      map.addLayer({
        id: 'social-radius',
        type: 'fill',
        source: 'social',
        filter: ['==', ['get', 'kind'], 'radius'],
        paint: {
          'fill-color': '#7dd3fc',
          'fill-opacity': 0.12,
        },
      })

      map.addLayer({
        id: 'selected-place-points',
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
        id: 'selected-person-points',
        type: 'circle',
        source: 'social',
        filter: ['==', ['get', 'kind'], 'person'],
        paint: {
          'circle-color': '#86efac',
          'circle-radius': ['interpolate', ['linear'], ['get', 'weight'], 0.2, 6, 1, 16],
          'circle-opacity': 0.95,
        },
      })

      const hoverLayers = [
        'zone-fill',
        'student-points',
        'selected-student-center',
        'venue-base',
        'venues-visited',
        'selected-place-points',
        'selected-person-points',
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

      map.on('click', 'student-points', (event) => {
        const feature = event.features?.[0]
        if (!feature) return
        emit('select-student', feature.properties.id)
        setPopup(feature, feature.geometry.coordinates)
      })

      map.on('click', 'selected-student-center', (event) => {
        const feature = event.features?.[0]
        if (!feature) return
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

      map.on('click', 'selected-place-points', (event) => {
        const feature = event.features?.[0]
        if (!feature) return
        setPopup(feature, feature.geometry.coordinates)
      })

      map.on('click', 'selected-person-points', (event) => {
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
      syncZoomStyles()
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

watch(() => currentZoom.value, syncZoomStyles)

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
}

.map-stage {
  position: relative;
}

.map {
  width: 100%;
  min-height: 560px;
  border-radius: 18px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.04);
}

.mini-popup {
  position: absolute;
  left: 14px;
  top: 14px;
  right: auto;
  bottom: auto;
  width: min(320px, calc(100% - 28px));
  padding: 14px;
  border-radius: 18px;
  background: rgba(11, 18, 32, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.35);
  z-index: 2;
  backdrop-filter: blur(12px);
}

.mini-popup-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 10px;
}

.mini-popup-header strong {
  display: block;
  font-size: 15px;
  line-height: 1.2;
}

.mini-popup-sub {
  color: #9aa9c3;
  font-size: 12px;
  margin-top: 4px;
}

.mini-popup-chip {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: #ecf6ff;
  font-size: 12px;
  text-transform: capitalize;
}

.mini-network {
  width: 100%;
  height: auto;
  display: block;
  overflow: visible;
  margin: 8px 0 8px;
}

.mini-link {
  stroke-width: 2;
  stroke-linecap: round;
}

.mini-link.person {
  stroke: rgba(134, 239, 172, 0.75);
}

.mini-link.place {
  stroke: rgba(196, 181, 253, 0.75);
}

.mini-node {
  stroke: #08101d;
  stroke-width: 2;
}

.mini-node.student {
  fill: #9ed0ff;
}

.mini-node.person {
  fill: #86efac;
}

.mini-node.place {
  fill: #c4b5fd;
}

.mini-label {
  fill: #ecf6ff;
  font-size: 11px;
  paint-order: stroke;
  stroke: #08101d;
  stroke-width: 3px;
  stroke-linejoin: round;
}

.mini-radius {
  fill: none;
  stroke: rgba(158, 208, 255, 0.26);
  stroke-width: 2;
  stroke-dasharray: 6 5;
}

.mini-center {
  fill: rgba(158, 208, 255, 0.18);
  stroke: #9ed0ff;
  stroke-width: 3;
}

.mini-center-label {
  fill: #ecf6ff;
  font-size: 11px;
  paint-order: stroke;
  stroke: #08101d;
  stroke-width: 3px;
  stroke-linejoin: round;
}

.mini-popup-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  color: #b4c4de;
  font-size: 12px;
}

.map-error {
  min-height: 180px;
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
