<template>
  <div class="page-container farmer-income-hub-page" :class="{ 'light-theme': isLight }">
    <div class="page-header">
      <h1 class="page-title">Farmer Income Records</h1>
      <p class="page-subtitle">Manage farmer income records and distributions</p>
    </div>

    <!-- Tab Buttons -->
    <div class="tabs-container">
      <!-- For President: verify, eligible, foundation -->
      <div v-if="isPresident" class="tabs">
        <button
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === 'verify' }"
          @click="activeTab = 'verify'"
        >
          <span>Verify Income</span>
          <span v-if="pendingCount !== null" class="tab-badge">{{ pendingCount }}</span>
        </button>
        <button
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === 'eligible' }"
          @click="activeTab = 'eligible'"
        >
          <span>Eligible Records</span>
          <span v-if="eligibleCount !== null" class="tab-badge">{{ eligibleCount }}</span>
        </button>
        <button
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === 'foundation' }"
          @click="activeTab = 'foundation'; loadBarangayFarmersForFoundation()"
        >
          <span>Pundasyon ng hula</span>
        </button>
      </div>

      <!-- For Officers: One tab -->
      <div v-else-if="isOfficer" class="tabs">
        <button
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === 'eligible' }"
          @click="activeTab = 'eligible'"
        >
          <span>Eligible Records</span>
          <span v-if="eligibleCount !== null" class="tab-badge">{{ eligibleCount }}</span>
        </button>
      </div>

      <!-- For Agriculturist: One tab -->
      <div v-else-if="isAgriculturist" class="tabs">
        <button
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === 'distribution' }"
          @click="activeTab = 'distribution'"
        >
          <span>Distribution Management</span>
        </button>
      </div>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      <!-- Verify Tab (President only) -->
      <PresidentFarmerIncomePage v-if="isPresident && activeTab === 'verify'" />

      <!-- Eligible Records Tab -->
      <OfficerFarmerIncomePage v-if="(isPresident || isOfficer) && activeTab === 'eligible'" />

      <!-- President: upload historical expense totals for a farmer (forecast foundation) -->
      <div v-if="isPresident && activeTab === 'foundation'" class="foundation-hub-panel">
        <p class="hub-foundation-intro">
          Pumili ng magsasaka sa inyong barangay upang mag-upload ng <strong>lumang kabuuang gastos</strong>
          (JSON o CSV). Ang datos ay ginagamit bilang pundasyon ng <em>hula ng gastos</em> sa kanilang
          Talaan ng Kita → tab na <strong>Hula ng gastos</strong>.
        </p>
        <div v-if="!currentUser?.barangay_id" class="alert-warn">Walang barangay ID ang account.</div>
        <template v-else>
          <div class="farmer-pick-row">
            <label for="foundation-farmer-select">Magsasaka</label>
            <select
              id="foundation-farmer-select"
              v-model.number="foundationFarmerId"
              class="foundation-farmer-select"
            >
              <option :value="0">— Pumili —</option>
              <option v-for="f in barangayFarmersList" :key="f.id" :value="f.id">
                {{ f.full_name }} (ID {{ f.id }})
              </option>
            </select>
          </div>
          <ExpenseFoundationUpload
            v-if="foundationFarmerId > 0"
            :key="foundationFarmerId"
            :farmer-id="foundationFarmerId"
          />
        </template>
      </div>

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
import { useBackdropTheme } from '../composables/useBackdropTheme'
import PresidentFarmerIncomePage from './PresidentFarmerIncomePage.vue'
import OfficerFarmerIncomePage from './OfficerFarmerIncomePage.vue'
import AgriculturistIncomeReviewPage from './AgriculturistIncomeReviewPage.vue'
import ExpenseFoundationUpload from '../components/ExpenseFoundationUpload.vue'

const authStore = useAuthStore()
const route = useRoute()
const { isDark } = useBackdropTheme()
const isLight = computed(() => !isDark.value)
const currentUser = computed(() => authStore.currentUser)

const isPresident = computed(() => currentUser.value?.role === 'president')
const isOfficer = computed(() => ['president', 'treasurer', 'auditor'].includes(currentUser.value?.role))
const isAgriculturist = computed(() => currentUser.value?.role === 'agriculturist')

const activeTab = ref('verify') // President starts with verify, others with eligible
const pendingCount = ref(null)
const eligibleCount = ref(null)
const barangayFarmersList = ref([])
const foundationFarmerId = ref(0)

const syncActiveTabFromRoute = () => {
  const requestedTab = String(route.query.tab || '').trim()
  if (!requestedTab) return

  if (isPresident.value && ['verify', 'eligible', 'foundation'].includes(requestedTab)) {
    activeTab.value = requestedTab
    if (requestedTab === 'foundation') loadBarangayFarmersForFoundation()
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

const loadBarangayFarmersForFoundation = async () => {
  if (!currentUser.value?.barangay_id || !authStore.token) return
  try {
    const res = await fetch(
      `/api/farmer-income/barangay-farmers/${currentUser.value.barangay_id}`,
      { headers: { Authorization: `Bearer ${authStore.token}` } }
    )
    const data = await res.json()
    if (res.ok && Array.isArray(data.farmers)) {
      barangayFarmersList.value = data.farmers
    }
  } catch (err) {
    console.error('loadBarangayFarmersForFoundation:', err)
  }
}

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
  box-sizing: border-box;
  background: transparent;
}

.farmer-income-hub-page:not(.light-theme) .page-header {
  margin-bottom: 32px;
  padding: 28px 32px;
  text-align: left;
  background: linear-gradient(145deg, rgba(18, 43, 29, 0.96), rgba(14, 33, 23, 0.95));
  border: 1px solid rgba(126, 184, 145, 0.22);
  border-radius: 26px;
  box-shadow: 0 18px 36px rgba(5, 12, 8, 0.32);
}

.farmer-income-hub-page:not(.light-theme) .page-title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #ffffff;
  font-size: clamp(2rem, 2.8vw, 2.6rem);
  font-weight: 900;
  letter-spacing: -0.04em;
  margin: 0 0 10px;
}

.farmer-income-hub-page:not(.light-theme) .page-subtitle {
  color: #ffffff;
  font-size: 1.05rem;
  margin: 0;
  max-width: 560px;
  line-height: 1.45;
}

.farmer-income-hub-page:not(.light-theme) .tabs-container {
  margin: 28px 0 30px;
  padding: 16px 18px;
  display: flex;
  justify-content: center;
  background: linear-gradient(145deg, rgba(66, 129, 92, 0.16), rgba(41, 88, 61, 0.18));
  border: 1px solid rgba(126, 184, 145, 0.24);
  border-radius: 24px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.tabs {
  display: flex;
  gap: 12px;
  border-bottom: none;
  flex-wrap: nowrap;
  justify-content: stretch;
  width: 100%;
}

.farmer-income-hub-page:not(.light-theme) .tab-btn {
  padding: 14px 24px;
  background: linear-gradient(135deg, rgba(156, 107, 40, 0.9), rgba(108, 149, 94, 0.9));
  border: 1px solid rgba(255, 232, 179, 0.36);
  border-radius: 16px;
  color: #ffffff;
  font-size: 1.02rem;
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 0.22s ease,
    filter 0.22s ease,
    box-shadow 0.22s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow:
    0 10px 20px rgba(20, 25, 20, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.16);
  min-height: 52px;
  letter-spacing: 0.01em;
  flex: 1 1 0;
}

.farmer-income-hub-page:not(.light-theme) .tab-btn:hover {
  color: #ffffff;
  transform: translateY(-2px);
  filter: brightness(1.06);
  box-shadow:
    0 14px 24px rgba(20, 25, 20, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.farmer-income-hub-page:not(.light-theme) .tab-btn.active {
  color: #052e16;
  border-bottom-color: transparent;
  background: linear-gradient(135deg, #bbf7d0 0%, #86efac 55%, #4ade80 100%);
  border-color: rgba(220, 252, 231, 0.9);
  box-shadow:
    0 12px 24px rgba(18, 24, 18, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
}

.farmer-income-hub-page:not(.light-theme) .tab-badge {
  background: #2563eb;
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
  border: 1px solid rgba(191, 219, 254, 0.35);
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.22);
}

.farmer-income-hub-page:not(.light-theme) .tab-btn.active .tab-badge {
  background: #1e3a8a;
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
  border-color: rgba(219, 234, 254, 0.45);
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #2563eb;
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
  border: 1px solid rgba(191, 219, 254, 0.35);
  border-radius: 999px;
  padding: 3px 9px;
  font-size: 0.82em;
  font-weight: 800;
  min-width: 20px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.18);
}

.tab-btn.active .tab-badge {
  background: #1e3a8a;
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
  border-color: rgba(219, 234, 254, 0.45);
}

.tab-content {
  margin-top: 18px;
}

.farmer-income-hub-page:not(.light-theme) .empty-state {
  text-align: center;
  padding: 56px 24px;
  border-radius: 24px;
  background: linear-gradient(145deg, rgba(18, 43, 29, 0.9), rgba(14, 33, 23, 0.88));
  border: 1px solid rgba(126, 184, 145, 0.2);
  box-shadow: 0 16px 30px rgba(5, 12, 8, 0.24);
}

.empty-icon {
  font-size: 4em;
  margin-bottom: 20px;
  line-height: 1;
}

.farmer-income-hub-page:not(.light-theme) .empty-state p {
  color: #ffffff;
  margin: 0;
  line-height: 1.5;
  font-size: 1.04rem;
}

.farmer-income-hub-page:not(.light-theme) .foundation-hub-panel {
  width: 100%;
  max-width: none;
  margin: 0;
  text-align: left;
  padding: 24px 26px;
  border-radius: 24px;
  background: linear-gradient(145deg, rgba(18, 43, 29, 0.9), rgba(14, 33, 23, 0.88));
  border: 1px solid rgba(126, 184, 145, 0.22);
  box-shadow: 0 16px 30px rgba(5, 12, 8, 0.24);
  box-sizing: border-box;
}

.foundation-hub-panel {
  width: 100%;
  max-width: none;
  margin: 0;
  box-sizing: border-box;
}

.foundation-hub-panel :deep(.foundation-panel) {
  margin-top: 0;
  width: 100%;
}

.farmer-income-hub-page:not(.light-theme) .hub-foundation-intro {
  font-size: 0.95rem;
  line-height: 1.55;
  color: #ffffff;
  margin: 0 0 1rem 0;
}

.farmer-income-hub-page:not(.light-theme) .hub-foundation-intro strong,
.farmer-income-hub-page:not(.light-theme) .hub-foundation-intro em {
  color: #ffffff;
}

.alert-warn {
  padding: 12px 16px;
  background: rgba(250, 204, 21, 0.12);
  color: #fde68a;
  border-radius: 12px;
  font-size: 0.95rem;
  border: 1px solid rgba(250, 204, 21, 0.35);
}

.farmer-pick-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 1rem;
}

.farmer-income-hub-page:not(.light-theme) .farmer-pick-row label {
  font-weight: 600;
  color: #ffffff;
  font-size: 0.9rem;
}

.farmer-income-hub-page:not(.light-theme) .foundation-farmer-select {
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(126, 184, 145, 0.35);
  font-size: 1rem;
  max-width: 100%;
  background: rgba(0, 0, 0, 0.28);
  color: #ffffff;
}

.foundation-farmer-select:focus {
  outline: none;
  border-color: rgba(74, 222, 128, 0.55);
  box-shadow: 0 0 0 2px rgba(74, 222, 128, 0.2);
}

/* ===== LIGHT MODE — white surfaces ===== */
.farmer-income-hub-page.light-theme .page-header {
  margin-bottom: 32px;
  padding: 28px 32px;
  text-align: left;
  background: #ffffff !important;
  border: 2px solid #86efac !important;
  border-radius: 26px;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1) !important;
}

.farmer-income-hub-page.light-theme .page-title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
  font-size: clamp(2rem, 2.8vw, 2.6rem);
  font-weight: 900;
  letter-spacing: -0.04em;
  margin: 0 0 10px;
}

.farmer-income-hub-page.light-theme .page-subtitle {
  color: #166534 !important;
  font-size: 1.05rem;
  margin: 0;
  max-width: 560px;
  line-height: 1.45;
}

.farmer-income-hub-page.light-theme .tabs-container {
  margin: 28px 0 30px;
  padding: 16px 18px;
  display: flex;
  justify-content: center;
  background: #ffffff !important;
  border: 2px solid #86efac !important;
  border-radius: 24px;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.08) !important;
}

.farmer-income-hub-page.light-theme .tab-btn {
  padding: 14px 24px;
  background: #ffffff !important;
  border: 2px solid #86efac !important;
  border-radius: 16px;
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
  font-size: 1.02rem;
  font-weight: 800;
  min-height: 52px;
  flex: 1 1 0;
  box-shadow: 0 4px 14px rgba(22, 101, 52, 0.08) !important;
}

.farmer-income-hub-page.light-theme .tab-btn.active,
.farmer-income-hub-page.light-theme .tab-btn:hover {
  background: #ffffff !important;
  border-color: #166534 !important;
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
}

.farmer-income-hub-page.light-theme .tab-badge {
  background: #1d4ed8 !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  padding: 4px 10px;
  min-width: 24px;
}

.farmer-income-hub-page.light-theme .tab-btn.active .tab-badge {
  background: #1e3a8a !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.farmer-income-hub-page.light-theme .hub-foundation-intro {
  margin: 0 0 1.35rem;
  line-height: 1.6;
}

.farmer-income-hub-page.light-theme .foundation-farmer-select {
  padding: 12px 16px;
  border-radius: 12px;
}

.farmer-income-hub-page.light-theme .empty-state,
.farmer-income-hub-page.light-theme .foundation-hub-panel {
  width: 100%;
  max-width: none;
  margin: 0;
  box-sizing: border-box;
  padding: 28px 32px;
  background: #ffffff !important;
  border: 2px solid #86efac !important;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.08) !important;
  border-radius: 24px;
}

.farmer-income-hub-page.light-theme .empty-state p,
.farmer-income-hub-page.light-theme .hub-foundation-intro,
.farmer-income-hub-page.light-theme .hub-foundation-intro strong,
.farmer-income-hub-page.light-theme .hub-foundation-intro em,
.farmer-income-hub-page.light-theme .farmer-pick-row label {
  color: #052e16 !important;
}

.farmer-income-hub-page.light-theme .foundation-farmer-select {
  background: #ffffff !important;
  border: 1px solid #d1d5db !important;
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
}

@media (max-width: 768px) {
  .page-header {
    text-align: center;
    padding: 22px 20px;
  }

  .page-title {
    justify-content: center;
  }

  .page-subtitle {
    margin: 0 auto;
  }

  .tabs {
    flex-wrap: wrap;
  }

  .tab-btn {
    flex: 1 1 calc(50% - 8px);
    min-width: min(100%, 200px);
  }
}
</style>
