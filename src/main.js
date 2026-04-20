import { createApp } from 'vue'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import './styles.css'
import App from './App.vue'

// Optional: avoids mapbox complaints about unsupported DOM APIs in some environments.
mapboxgl.workerCount = 1

createApp(App).mount('#app')
