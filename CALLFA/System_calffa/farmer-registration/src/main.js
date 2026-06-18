// src/main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import './style.css'
import './assets/backdrop-theme.css'
import './styles/glass-unified-theme.css'
import './styles/light-mode-senior.css'
import './styles/dark-mode-farm.css'
import './styles/table-action-buttons.css'
import './styles/compact-data-table.css'
import 'leaflet/dist/leaflet.css'






const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')