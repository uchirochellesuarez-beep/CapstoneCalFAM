<template>
  <div id="app" class="glass-shell">
    <!-- Header only shown when not authenticated (on login/register pages) -->
    <header v-if="!isAuthenticated" class="app-header sticky top-0 z-50 shadow-md">
      <div class="header-content">
        <div class="logo-container">
          <div class="department-logo wheat-icon"></div>
          <div>
            <p class="header-subtitle">Farmer Registration Portal</p>
          </div>
        </div>
        <nav class="nav-links">
          <ThemeToggle variant="inline" />
        </nav>
      </div>
    </header>

    <div class="app-container glass-app-container">
      <router-view />
    </div>

  </div>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import { useAuthStore } from './stores/authStore'
import { useBackdropTheme } from './composables/useBackdropTheme'
import ThemeToggle from './components/ThemeToggle.vue'

const authStore = useAuthStore()
const { initTheme, watchSystemTheme, syncThemeForUser } = useBackdropTheme()

const isAuthenticated = computed(() => !!authStore.currentUser)

onMounted(() => {
  initTheme()
  watchSystemTheme()
})

watch(
  () => authStore.currentUser,
  (user) => syncThemeForUser(user),
  { immediate: true }
)
</script>

<style>
.app-container {
  width: 100%;
  min-height: 100vh;
  position: relative;
}
</style>
