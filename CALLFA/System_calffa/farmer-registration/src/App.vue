<template>
  <div id="app" class="glass-shell">
    <!-- Header only shown when not authenticated (on login/register pages) -->
    <header v-if="showGuestHeader" class="app-header sticky top-0 z-50 shadow-md">
      <div class="header-content">
        <div class="logo-container">
          <div class="department-logo wheat-icon"></div>
          <div>
            <p class="header-subtitle">{{ t('brand.portalSubtitle') }}</p>
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
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from './stores/authStore'
import { useBackdropTheme } from './composables/useBackdropTheme'
import ThemeToggle from './components/ThemeToggle.vue'

const authStore = useAuthStore()
const route = useRoute()
const { t } = useI18n()
const { initTheme, watchSystemTheme, syncThemeForUser } = useBackdropTheme()

const isAuthenticated = computed(() => !!authStore.currentUser)
const guestChromeRoutes = ['/landing', '/login', '/signup', '/google-registration']
const showGuestHeader = computed(
  () => !isAuthenticated.value && !guestChromeRoutes.includes(route.path)
)

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
