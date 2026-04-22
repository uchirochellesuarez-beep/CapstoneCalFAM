<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">📊 Farmer Income Records</h1>
      <p class="page-subtitle">Manage farmer income records and distributions</p>
    </div>

    <!-- Tab Buttons -->
    <div class="tabs-container">
      <!-- For President: Two tabs -->
      <div v-if="isPresident" class="tabs">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'verify' }"
          @click="activeTab = 'verify'"
        >
          🔍 Verify Income
          <span v-if="pendingCount !== null" class="tab-badge">{{ pendingCount }}</span>
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'eligible' }"
          @click="activeTab = 'eligible'"
        >
          ✅ Eligible Records
          <span v-if="eligibleCount !== null" class="tab-badge">{{ eligibleCount }}</span>
        </button>
      </div>

      <!-- For Officers: One tab -->
      <div v-else-if="isOfficer" class="tabs">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'eligible' }"
          @click="activeTab = 'eligible'"
        >
          ✅ Eligible Records
          <span v-if="eligibleCount !== null" class="tab-badge">{{ eligibleCount }}</span>
        </button>
      </div>

      <!-- For Agriculturist: One tab -->
      <div v-else-if="isAgriculturist" class="tabs">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'distribution' }"
          @click="activeTab = 'distribution'"
        >
          🌾 Distribution Management
        </button>
      </div>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      <!-- Verify Tab (President only) -->
      <PresidentFarmerIncomePage v-if="isPresident && activeTab === 'verify'" />

      <!-- Eligible Records Tab -->
      <OfficerFarmerIncomePage v-if="(isPresident || isOfficer) && activeTab === 'eligible'" />

      <!-- Distribution Tab (Agriculturist only) -->
      <AgriculturistIncomeReviewPage v-if="isAgriculturist && activeTab === 'distribution'" />
    </div>

    <!-- No access message -->
    <div v-if="!isPresident && !isOfficer && !isAgriculturist" class="empty-state">
      <div class="empty-icon">🚫</div>
      <p>No access to Farmer Income Records for your role.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import PresidentFarmerIncomePage from './PresidentFarmerIncomePage.vue'
import OfficerFarmerIncomePage from './OfficerFarmerIncomePage.vue'
import AgriculturistIncomeReviewPage from './AgriculturistIncomeReviewPage.vue'

const authStore = useAuthStore()
const route = useRoute()
const currentUser = computed(() => authStore.currentUser)

const isPresident = computed(() => currentUser.value?.role === 'president')
const isOfficer = computed(() => ['president', 'treasurer', 'auditor'].includes(currentUser.value?.role))
const isAgriculturist = computed(() => currentUser.value?.role === 'agriculturist')

const activeTab = ref('verify') // President starts with verify, others with eligible
const pendingCount = ref(null)
const eligibleCount = ref(null)

const syncActiveTabFromRoute = () => {
  const requestedTab = String(route.query.tab || '').trim()
  if (!requestedTab) return

  if (isPresident.value && ['verify', 'eligible'].includes(requestedTab)) {
    activeTab.value = requestedTab
    return
  }

  if (isAgriculturist.value && requestedTab === 'distribution') {
    activeTab.value = 'distribution'
    return
  }

  if (isOfficer.value && !isPresident.value && requestedTab === 'eligible') {
    activeTab.value = 'eligible'
  }
}

// Set initial active tab based on role
onMounted(() => {
  if (isOfficer.value && !isPresident.value) {
    activeTab.value = 'eligible'
  } else if (isAgriculturist.value) {
    activeTab.value = 'distribution'
  }

  syncActiveTabFromRoute()
  
  // Fetch stats for badges
  fetchStats()
})

watch(() => route.query.tab, () => {
  syncActiveTabFromRoute()
})

// Fetch statistics
const fetchStats = async () => {
  if (!currentUser.value?.barangay_id) return
  try {
    const res = await fetch(`/api/farmer-income/by-barangay/${currentUser.value.barangay_id}`, {
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    })
    const data = await res.json()
    if (res.ok) {
      pendingCount.value = data.filter(r => r.status === 'Pending').length
      eligibleCount.value = data.filter(r => r.status === 'Eligible').length
    }
  } catch (err) {
    console.error('Error fetching stats:', err)
  }
}
</script>

<style scoped>
.page-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  margin-bottom: 30px;
  text-align: center;
}

.page-title {
  font-size: 2.2em;
  color: #2c3e50;
  margin: 0 0 10px 0;
}

.page-subtitle {
  font-size: 1em;
  color: #7f8c8d;
  margin: 0;
}

.tabs-container {
  margin: 30px 0;
  display: flex;
  justify-content: center;
}

.tabs {
  display: flex;
  gap: 10px;
  border-bottom: 2px solid #ecf0f1;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 12px 24px;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  color: #7f8c8d;
  font-size: 1em;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  bottom: -2px;
}

.tab-btn:hover {
  color: #3498db;
}

.tab-btn.active {
  color: #3498db;
  border-bottom-color: #3498db;
}

.tab-badge {
  display: inline-block;
  background: #3498db;
  color: white;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 0.85em;
  font-weight: 600;
  min-width: 20px;
  text-align: center;
}

.tab-content {
  margin-top: 20px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 4em;
  margin-bottom: 20px;
}

.empty-state p {
  font-size: 1.2em;
  color: #7f8c8d;
  margin: 0;
}
</style>
