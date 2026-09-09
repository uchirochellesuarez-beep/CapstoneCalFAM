<template>
  <div class="page-container farmer-income-hub-page machinery-ui glass-module-page" :class="{ 'light-theme': isLight }">
    <div class="page-header page-header-split">
      <div class="page-header-text">
        <h1 class="page-title">{{ $t('ui.farmerIncomeRecords') }}</h1>
        <p class="page-subtitle">{{ $t('ui.manageIncomeHubSub') }}</p>
      </div>
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
          <span class="tab-btn-label">{{ $t('common.verifyIncome') }}</span>
          <span v-if="pendingCount !== null" class="tab-badge">{{ pendingCount }}</span>
        </button>
        <button
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === 'eligible' }"
          @click="activeTab = 'eligible'"
        >
          <span class="tab-btn-label">{{ $t('common.eligibleRecords') }}</span>
          <span v-if="eligibleCount !== null" class="tab-badge">{{ eligibleCount }}</span>
        </button>
        <button
          type="button"
          class="tab-btn tab-btn--wide"
          :class="{ active: activeTab === 'foundation' }"
          @click="activeTab = 'foundation'; loadBarangayFarmersForFoundation()"
        >
          <span class="tab-btn-label">{{ $t('common.forecastFoundation') }}</span>
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
          <span class="tab-btn-label">{{ $t('common.eligibleRecords') }}</span>
          <span v-if="eligibleCount !== null" class="tab-badge">{{ eligibleCount }}</span>
        </button>
      </div>

      <!-- For Agriculturist: section label (single view, not clickable) -->
      <div v-else-if="isAgriculturist" class="tabs tabs--label-only">
        <p class="section-label">{{ $t('ui.distributionManagement') }}</p>
      </div>
    </div>

    <!-- Tab Content -->
    <div class="tab-content tab-content--main">
      <!-- Verify Tab (President only) -->
      <PresidentFarmerIncomePage v-if="isPresident && activeTab === 'verify'" @records-changed="fetchStats" />

      <!-- Eligible Records Tab -->
      <OfficerFarmerIncomePage v-if="(isPresident || isOfficer) && activeTab === 'eligible'" />

      <!-- President: upload historical expense totals for a farmer (forecast foundation) -->
      <div v-if="isPresident && activeTab === 'foundation'" class="foundation-hub-panel">
        <p class="hub-foundation-intro">
          Pumili ng magsasaka sa inyong barangay upang mag-upload ng <strong>{{ $t('ui.oldTotalExpense') }}</strong>
          (JSON o CSV). Ang datos ay ginagamit bilang pundasyon ng <em>hula ng gastos</em> sa kanilang
          Talaan ng Kita → tab na <strong>{{ $t('ui.forecastExpense') }}</strong>.
        </p>
        <div v-if="!currentUser?.barangay_id" class="alert-warn">{{ $t('ui.noBarangayId') }}</div>
        <template v-else>
          <div class="farmer-pick-row">
            <label for="foundation-farmer-select">{{ $t('ui.farmer') }}</label>
            <select
              id="foundation-farmer-select"
              v-model.number="foundationFarmerId"
              class="foundation-farmer-select"
            >
              <option :value="0">{{ $t('ui.choose') }}</option>
              <option v-for="f in barangayFarmersList" :key="f.id" :value="f.id">
                {{ f.full_name }}
              </option>
            </select>
          </div>
          <ExpenseFoundationUpload
            v-if="foundationFarmerId > 0"
            :key="foundationFarmerId"
            :farmer-id="foundationFarmerId"
            :hide-id-note="true"
            :is-light="isLight"
          />
        </template>
      </div>

      <!-- Distribution Tab (Agriculturist only) -->
      <AgriculturistIncomeReviewPage v-if="isAgriculturist && activeTab === 'distribution'" />
    </div>

    <!-- No access message -->
    <div v-if="!isPresident && !isOfficer && !isAgriculturist" class="empty-state">
      <p class="empty-title">No access</p>
      <p class="empty-text">No access to Farmer Income Records for your role.</p>
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

watch(() => [route.query.tab, route.query.highlight, route.query.nav], () => {
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
      pendingCount.value = data.filter((r) => {
        const s = String(r.status || '').trim()
        return s === 'Pending' || s === 'Submitted' || s === 'Under Review' || s === ''
      }).length
      eligibleCount.value = data.filter(r => r.status === 'Eligible').length
    }
  } catch (err) {
    console.error('Error fetching stats:', err)
  }
}
</script>

<style scoped>
/* Page shell — match Machinery Management / Operator Dashboard geometry */
.page-container.farmer-income-hub-page {
  --surface-1: rgba(28, 42, 33, 0.92);
  --surface-2: rgba(24, 39, 30, 0.92);
  --line-soft: rgba(190, 235, 203, 0.14);
  --text-main: #eefde6;
  --text-muted: rgba(229, 235, 231, 0.82);
  --panel-shadow: 0 8px 26px rgba(0, 0, 0, 0.3), inset 1px 1px 0 rgba(255, 255, 255, 0.05);
  --fin-radius: 14px;
  --fin-control-h: 2.45rem;
  padding: 2rem;
  max-width: none;
  margin: 0 -1.5rem;
  width: calc(100% + 3rem);
  min-height: calc(100vh - 70px - 3rem);
  box-sizing: border-box;
  background: linear-gradient(145deg, #0f1712 0%, #132119 22%, #1a2b20 45%, #243b2c 72%, #2f4a38 100%);
  color: #eefde6;
  border-radius: 18px;
  font-family: 'Segoe UI', system-ui, sans-serif;
  position: relative;
  overflow-x: hidden;
  padding-bottom: 1.25rem;
}

.farmer-income-hub-page::before,
.farmer-income-hub-page::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  border-radius: inherit;
}

.farmer-income-hub-page::before {
  background:
    radial-gradient(ellipse 80% 50% at 12% 88%, rgba(110, 231, 168, 0.06) 0%, transparent 58%),
    radial-gradient(ellipse 70% 50% at 88% 12%, rgba(232, 196, 104, 0.05) 0%, transparent 55%);
}

.farmer-income-hub-page::after {
  background:
    radial-gradient(circle at 90% 8%, rgba(232, 196, 104, 0.05) 0%, transparent 24%),
    radial-gradient(circle at 10% 90%, rgba(61, 122, 92, 0.08) 0%, transparent 22%);
}

.farmer-income-hub-page > * {
  position: relative;
  z-index: 1;
}

.page-header-split {
  margin-bottom: 1rem;
  padding: 0.9rem 1.1rem 0.85rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-radius: var(--fin-radius);
  position: relative;
  overflow: hidden;
  background: var(--surface-1);
  border: 1px solid var(--line-soft);
  box-shadow: var(--panel-shadow);
}

.page-header-split::before {
  content: '';
  position: absolute;
  top: -62px;
  right: -72px;
  width: 220px;
  height: 220px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(74, 222, 128, 0.2) 0%, transparent 68%);
  pointer-events: none;
}

.page-header-split::after {
  content: '';
  position: absolute;
  left: 1.4rem;
  right: 1.4rem;
  bottom: 0.55rem;
  height: 1px;
  background: linear-gradient(90deg, rgba(74, 222, 128, 0.42), rgba(45, 212, 191, 0.12));
  pointer-events: none;
}

.page-header-text {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
}

.page-title {
  font-size: 1.55rem;
  font-weight: 800;
  line-height: 1.2;
  margin: 0 0 0.2rem;
  color: var(--text-main);
  letter-spacing: -0.02em;
}

.page-subtitle {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 600;
  line-height: 1.35;
  color: var(--text-muted);
}

.tabs-container {
  margin-bottom: 1rem;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 0.35rem;
  border-radius: 12px;
  background: rgba(15, 40, 28, 0.45);
  border: 1px solid rgba(126, 184, 145, 0.2);
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: var(--fin-control-h);
  padding: 0.45rem 0.9rem;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: rgba(209, 250, 229, 0.78);
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.tab-btn:hover {
  background: rgba(74, 222, 128, 0.1);
  color: #ecfdf5;
}

.tab-btn.active {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow: 0 4px 12px rgba(22, 163, 74, 0.28);
}

.tab-btn-label {
  line-height: 1.2;
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.35rem;
  height: 1.35rem;
  padding: 0 0.35rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 800;
  background: rgba(0, 0, 0, 0.22);
  color: inherit;
}

.tab-btn.active .tab-badge {
  background: rgba(255, 255, 255, 0.22);
}

.tabs--label-only {
  background: transparent;
  border: none;
  padding: 0;
}

.section-label {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.01em;
  color: #ecfdf5;
}

.farmer-income-hub-page.light-theme .section-label {
  color: #14532d;
}

.tab-content--main {
  min-width: 0;
  width: 100%;
  padding: 1rem 1.1rem;
  border-radius: 16px;
  box-sizing: border-box;
  background: linear-gradient(145deg, rgba(18, 43, 29, 0.9), rgba(14, 33, 23, 0.88));
  border: 1px solid rgba(126, 184, 145, 0.22);
}

.foundation-hub-panel {
  padding: 0;
}

.hub-foundation-intro {
  margin: 0 0 1rem;
  font-size: 0.9rem;
  line-height: 1.5;
  color: rgba(209, 250, 229, 0.88);
}

.farmer-pick-row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 1rem;
  max-width: 28rem;
}

.farmer-pick-row label {
  font-size: 0.8rem;
  font-weight: 700;
  color: rgba(209, 250, 229, 0.85);
}

.foundation-farmer-select {
  min-height: var(--fin-control-h);
  padding: 0.45rem 0.75rem;
  border-radius: 10px;
  border: 1px solid rgba(126, 184, 145, 0.3);
  background: rgba(8, 24, 16, 0.65);
  color: #ecfdf5;
  font-size: 0.9rem;
  box-sizing: border-box;
}

.alert-warn {
  padding: 0.75rem 1rem;
  border-radius: 10px;
  background: rgba(234, 179, 8, 0.15);
  border: 1px solid rgba(234, 179, 8, 0.35);
  color: #fde68a;
  font-size: 0.88rem;
}

.empty-state {
  text-align: center;
  padding: 2.5rem 1rem;
  color: rgba(209, 250, 229, 0.75);
}

.empty-title {
  font-weight: 800;
  font-size: 0.85rem;
  color: var(--text-main, #eefde6);
  margin: 0 0 4px;
}

.empty-text {
  font-size: 11px;
  color: rgba(209, 250, 229, 0.75);
  margin: 0;
  line-height: 1.45;
}

.empty-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

/* Light theme — colors only; geometry identical */
.farmer-income-hub-page.light-theme {
  background: linear-gradient(160deg, #f7fdf9 0%, #f0fdf4 45%, #e8f8ec 100%);
  color: #052e16;
}

.farmer-income-hub-page.light-theme::before,
.farmer-income-hub-page.light-theme::after {
  opacity: 0.35;
}

.farmer-income-hub-page.light-theme .page-header-split {
  background: #ffffff;
  border-color: #86efac;
  box-shadow: 0 8px 22px rgba(15, 50, 30, 0.08), inset 1px 1px 0 rgba(255, 255, 255, 0.8);
}

.farmer-income-hub-page.light-theme .page-title {
  color: #052e16;
}

.farmer-income-hub-page.light-theme .page-subtitle {
  color: #166534;
}

.farmer-income-hub-page.light-theme .tabs {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(34, 120, 70, 0.16);
}

.farmer-income-hub-page.light-theme .tab-btn {
  color: #3f6b52;
}

.farmer-income-hub-page.light-theme .tab-btn:hover {
  background: rgba(34, 120, 70, 0.08);
  color: #14532d;
}

.farmer-income-hub-page.light-theme .tab-btn.active {
  background: linear-gradient(135deg, #16a34a, #15803d);
  color: #fff;
}

.farmer-income-hub-page.light-theme .tab-content--main {
  background: #ffffff;
  border-color: #bbf7d0;
}

.farmer-income-hub-page.light-theme .hub-foundation-intro {
  color: #3f6b52;
}

.farmer-income-hub-page.light-theme .farmer-pick-row label {
  color: #14532d;
}

.farmer-income-hub-page.light-theme .foundation-farmer-select {
  background: #fff;
  border-color: rgba(34, 120, 70, 0.22);
  color: #14532d;
}

.farmer-income-hub-page.light-theme .alert-warn {
  background: #fffbeb;
  border-color: #fcd34d;
  color: #92400e;
}

.farmer-income-hub-page.light-theme .empty-state {
  color: #3f6b52;
}

@media (max-width: 768px) {
  .page-container.farmer-income-hub-page {
    margin: 0 -0.75rem;
    width: calc(100% + 1.5rem);
    padding: 0.75rem;
    border-radius: 0;
    min-height: 0;
  }

  .page-header-split {
    margin-bottom: 0.65rem;
    padding: 0.65rem 0.75rem;
  }

  .page-header-split::after {
    display: none;
  }

  .page-title {
    font-size: 1.15rem;
    margin: 0 0 0.1rem;
  }

  .page-subtitle {
    font-size: 0.72rem;
    line-height: 1.3;
  }

  .tabs-container {
    margin-bottom: 0.65rem;
  }

  .tabs {
    flex-wrap: nowrap;
    gap: 0.25rem;
    padding: 0.28rem;
  }

  .tab-btn,
  .tab-btn.tab-btn--wide {
    flex: 1 1 0;
    min-width: 0;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 2.65rem;
    padding: 0.35rem 0.25rem;
    gap: 0.15rem;
    text-align: center;
    font-size: 0.62rem;
  }

  .tab-btn-label {
    text-align: center;
    line-height: 1.15;
    font-size: 0.62rem;
    white-space: normal;
    word-break: break-word;
  }

  .tab-badge {
    min-width: 1.15rem;
    height: 1.15rem;
    font-size: 0.62rem;
  }

  .section-label {
    font-size: 0.72rem;
  }

  .tab-content--main {
    padding: 0.65rem 0.7rem;
    border-radius: 12px;
  }

  .hub-foundation-intro {
    font-size: 0.82rem;
  }

  .farmer-pick-row {
    max-width: none;
  }
}

@media (max-width: 480px) {
  .page-container.farmer-income-hub-page {
    padding: 0.65rem;
  }

  .page-header-split {
    padding: 0.6rem 0.7rem;
  }

  .page-title {
    font-size: 1.1rem;
  }

  .tab-btn-label {
    font-size: 0.55rem;
  }
}
</style>
