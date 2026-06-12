<template>
  <div class="financial-overview-container glass-module-page" :class="{ 'light-theme': isLight }">
    <div class="page-header no-print">
      <div class="page-header-left">
        <h1 class="page-title">Financial Overview</h1>
      </div>
      <div class="header-actions">
        <button class="export-btn" @click="printReport">🖨️ Print Report</button>
        <button class="export-btn" @click="exportCSV">📥 Download CSV</button>
      </div>
    </div>

    <div class="filters-bar no-print">
      <div v-if="isAdmin" class="filter-group">
        <label class="filter-label">Barangay</label>
        <select v-model="filterBarangay" class="filter-input">
          <option value="">All Barangays</option>
          <option v-for="b in barangayOptions" :key="b.id" :value="String(b.id)">{{ b.name }}</option>
        </select>
      </div>
      <div class="filter-group">
        <label class="filter-label">From</label>
        <input v-model="filterDateFrom" type="date" class="filter-input" />
      </div>
      <div class="filter-group">
        <label class="filter-label">To</label>
        <input v-model="filterDateTo" type="date" class="filter-input" />
      </div>
      <button class="filter-clear-btn" @click="clearFilters">Clear</button>
    </div>

    <div id="printable-report" class="printable-report">
      <div class="report-banner print-only">
        <h2>Financial Overview — System Summary Report</h2>
        <p>{{ reportScope }}</p>
        <p class="report-date">Generated: {{ reportGeneratedAt }}</p>
      </div>

      <!-- System-wide KPIs -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-info">
            <div class="stat-label">Loan Collections</div>
            <div class="stat-value collected">₱{{ totalCollected.toLocaleString() }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-info">
            <div class="stat-label">Loan Outstanding</div>
            <div class="stat-value outstanding">₱{{ outstandingBalance.toLocaleString() }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-info">
            <div class="stat-label">Machinery Income</div>
            <div class="stat-value collected">₱{{ machineryIncome.toLocaleString() }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-info">
            <div class="stat-label">Machinery Expenses</div>
            <div class="stat-value expense">₱{{ machineryExpenses.toLocaleString() }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-info">
            <div class="stat-label">Machinery Net</div>
            <div class="stat-value" :class="machineryNet >= 0 ? 'collected' : 'overdue'">₱{{ machineryNet.toLocaleString() }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-info">
            <div class="stat-label">Share Capital Balance</div>
            <div class="stat-value">₱{{ shareCapitalBalance.toLocaleString() }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-info">
            <div class="stat-label">Share Capital Contributed</div>
            <div class="stat-value collected">₱{{ shareCapitalContributed.toLocaleString() }}</div>
          </div>
        </div>
      </div>

      <!-- Charts -->
      <div class="charts-row">
        <div class="chart-card">
          <h3 class="chart-title">Finance by Module (Inflows)</h3>
          <div class="chart-canvas-wrap">
            <canvas ref="moduleChartRef"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <h3 class="chart-title">Machinery Income vs Expenses</h3>
          <div class="chart-canvas-wrap">
            <canvas ref="machineryChartRef"></canvas>
          </div>
        </div>
      </div>

      <!-- Consolidated module summary -->
      <div class="financial-table-section">
        <div class="table-header">
          <h3 class="section-title">Consolidated Financial Summary</h3>
        </div>
        <table class="financial-table">
          <thead>
            <tr>
              <th>Module</th>
              <th>Inflows / Collected</th>
              <th>Outflows / Disbursed</th>
              <th>Net / Balance</th>
              <th>Detail Page</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="5" class="loading-cell">Loading financial data...</td>
            </tr>
            <template v-else>
              <tr v-for="row in moduleSummaryRows" :key="row.key">
                <td><strong>{{ row.label }}</strong></td>
                <td class="collected">₱{{ row.inflow.toLocaleString() }}</td>
                <td class="expense">₱{{ row.outflow.toLocaleString() }}</td>
                <td :class="row.net >= 0 ? 'collected' : 'overdue'">₱{{ row.net.toLocaleString() }}</td>
                <td class="module-link-cell no-print">
                  <router-link :to="row.route" class="inline-link">{{ row.linkLabel }} →</router-link>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Loans summary -->
      <div class="financial-table-section module-section">
        <div class="table-header">
          <h3 class="section-title">Loans — Summary</h3>
          <router-link to="/admin-loans" class="view-all-link no-print">Loan Management →</router-link>
        </div>
        <table class="financial-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Total disbursed</td><td class="amount">₱{{ totalDisbursed.toLocaleString() }}</td></tr>
            <tr><td>Total collected</td><td class="collected">₱{{ totalCollected.toLocaleString() }}</td></tr>
            <tr><td>Outstanding balance</td><td class="outstanding">₱{{ outstandingBalance.toLocaleString() }}</td></tr>
            <tr><td>Overdue ({{ overdueCount }} loans)</td><td class="overdue">₱{{ overdueAmount.toLocaleString() }}</td></tr>
            <tr><td>Collection rate</td><td class="rate">{{ collectionRate }}%</td></tr>
            <tr><td>Active portfolio</td><td>{{ activePortfolioCount }} loans</td></tr>
            <tr><td>Payment transactions</td><td>{{ collectionsPerformance.paymentCount }}</td></tr>
          </tbody>
        </table>
        <table class="financial-table sub-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Loans</th>
              <th>Outstanding</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in statusSummaryRows" :key="row.status">
              <td>{{ row.label }}</td>
              <td>{{ row.count }}</td>
              <td class="outstanding">₱{{ row.outstanding.toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Machinery summary -->
      <div class="financial-table-section module-section">
        <div class="table-header">
          <h3 class="section-title">Machinery — Summary</h3>
          <router-link to="/machinery-financial" class="view-all-link no-print">Machinery Financial →</router-link>
        </div>
        <table class="financial-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Total income</td><td class="collected">₱{{ machineryIncome.toLocaleString() }}</td></tr>
            <tr><td>Total expenses</td><td class="expense">₱{{ machineryExpenses.toLocaleString() }}</td></tr>
            <tr><td>Net profit / loss</td><td :class="machineryNet >= 0 ? 'collected' : 'overdue'">₱{{ machineryNet.toLocaleString() }}</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Share capital summary -->
      <div class="financial-table-section module-section">
        <div class="table-header">
          <h3 class="section-title">Share Capital — Summary</h3>
          <router-link to="/share-capital" class="view-all-link no-print">Share Capital →</router-link>
        </div>
        <table class="financial-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Members with share capital</td><td>{{ shareCapitalMembers }}</td></tr>
            <tr><td>Total contributed</td><td class="collected">₱{{ shareCapitalContributed.toLocaleString() }}</td></tr>
            <tr><td>Total withdrawn</td><td class="expense">₱{{ shareCapitalWithdrawn.toLocaleString() }}</td></tr>
            <tr><td>Current balance</td><td class="amount">₱{{ shareCapitalBalance.toLocaleString() }}</td></tr>
          </tbody>
        </table>
      </div>

      <p class="report-footer print-only">
        CaLFFA Financial Overview — system summary only. Use Loan Management, Machinery Financial, and Share Capital for detailed records.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useBackdropTheme } from '../composables/useBackdropTheme'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const authStore = useAuthStore()
const { isDark } = useBackdropTheme()
const isLight = computed(() => !isDark.value)

const loading = ref(true)
const allLoans = ref([])
const paymentHistory = ref([])
const barangays = ref([])
const machinerySummary = ref({ total_income: 0, total_expenses: 0, net_profit: 0 })
const shareCapitalTotals = ref({ total_farmers: 0, total_collected: 0, total_withdrawn: 0, total_balance: 0 })

const filterBarangay = ref('')
const filterDateFrom = ref('')
const filterDateTo = ref('')

const moduleChartRef = ref(null)
const machineryChartRef = ref(null)
let moduleChart = null
let machineryChart = null

const STATUS_ORDER = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'active', label: 'Partial Paid' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'paid', label: 'Fully Paid' },
  { key: 'rejected', label: 'Rejected' }
]

const reportGeneratedAt = computed(() =>
  new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
)

const isAdmin = computed(() => authStore.currentUser?.role === 'admin')
const userBarangayId = computed(() => authStore.currentUser?.barangay_id)
const canViewShareCapital = computed(() => ['admin', 'president', 'treasurer'].includes(authStore.currentUser?.role))

const barangayOptions = computed(() =>
  barangays.value.map(b => ({
    id: b.id || b.barangay_id,
    name: b.name || b.barangay_name || String(b.id)
  }))
)

const userBarangayName = computed(() => {
  if (!userBarangayId.value) return ''
  const match = barangayOptions.value.find(b => String(b.id) === String(userBarangayId.value))
  return match?.name || ''
})

const selectedBarangayName = computed(() => {
  if (!filterBarangay.value) return ''
  const match = barangayOptions.value.find(b => String(b.id) === String(filterBarangay.value))
  return match?.name || ''
})

const getLoanBarangayId = (loan) => String(loan.barangay_id || loan.farmer_barangay || '')

const filteredLoans = computed(() => {
  let list = allLoans.value
  if (filterBarangay.value) {
    list = list.filter(loan => getLoanBarangayId(loan) === String(filterBarangay.value))
  }
  if (filterDateFrom.value) {
    list = list.filter(loan => (loan.application_date || '').slice(0, 10) >= filterDateFrom.value)
  }
  if (filterDateTo.value) {
    list = list.filter(loan => (loan.application_date || '').slice(0, 10) <= filterDateTo.value)
  }
  return list
})

const filteredLoanIds = computed(() => new Set(filteredLoans.value.map(l => l.id)))

const portfolioLoans = computed(() =>
  filteredLoans.value.filter(l => ['approved', 'active', 'overdue', 'paid'].includes(l.status))
)

const totalDisbursed = computed(() =>
  portfolioLoans.value.reduce((sum, loan) => sum + parseFloat(loan.loan_amount || 0), 0)
)

const totalCollected = computed(() =>
  portfolioLoans.value.reduce((sum, loan) => sum + parseFloat(loan.total_paid || 0), 0)
)

const outstandingBalance = computed(() =>
  filteredLoans.value
    .filter(l => ['approved', 'active', 'overdue'].includes(l.status))
    .reduce((sum, loan) => {
      if (loan.status === 'approved') return sum + parseFloat(loan.loan_amount || 0)
      return sum + parseFloat(loan.remaining_balance || loan.loan_amount || 0)
    }, 0)
)

const overdueCount = computed(() => filteredLoans.value.filter(l => l.status === 'overdue').length)

const overdueAmount = computed(() =>
  filteredLoans.value
    .filter(l => l.status === 'overdue')
    .reduce((sum, loan) => sum + parseFloat(loan.total_with_penalty || loan.remaining_balance || loan.loan_amount || 0), 0)
)

const collectionRate = computed(() => {
  if (totalDisbursed.value <= 0) return '0.0'
  return ((totalCollected.value / totalDisbursed.value) * 100).toFixed(1)
})

const activePortfolioCount = computed(() =>
  filteredLoans.value.filter(l => ['approved', 'active', 'overdue'].includes(l.status)).length
)

const filteredPayments = computed(() => {
  let payments = paymentHistory.value.filter(p => filteredLoanIds.value.has(p.loan_id))
  if (filterDateFrom.value) {
    payments = payments.filter(p => (p.payment_date || '').slice(0, 10) >= filterDateFrom.value)
  }
  if (filterDateTo.value) {
    payments = payments.filter(p => (p.payment_date || '').slice(0, 10) <= filterDateTo.value)
  }
  return payments
})

const collectionsPerformance = computed(() => ({
  paymentCount: filteredPayments.value.length,
  totalAmount: filteredPayments.value.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
}))

const machineryIncome = computed(() => parseFloat(machinerySummary.value.total_income || 0))
const machineryExpenses = computed(() => parseFloat(machinerySummary.value.total_expenses || 0))
const machineryNet = computed(() => parseFloat(machinerySummary.value.net_profit || 0))

const shareCapitalMembers = computed(() => shareCapitalTotals.value.total_farmers || 0)
const shareCapitalContributed = computed(() => parseFloat(shareCapitalTotals.value.total_collected || 0))
const shareCapitalWithdrawn = computed(() => parseFloat(shareCapitalTotals.value.total_withdrawn || 0))
const shareCapitalBalance = computed(() => parseFloat(shareCapitalTotals.value.total_balance || 0))

const moduleSummaryRows = computed(() => [
  {
    key: 'loans',
    label: 'Loans',
    inflow: totalCollected.value,
    outflow: totalDisbursed.value,
    net: totalCollected.value - outstandingBalance.value,
    route: '/admin-loans',
    linkLabel: 'Loan Management'
  },
  {
    key: 'machinery',
    label: 'Machinery',
    inflow: machineryIncome.value,
    outflow: machineryExpenses.value,
    net: machineryNet.value,
    route: '/machinery-financial',
    linkLabel: 'Machinery Financial'
  },
  {
    key: 'share-capital',
    label: 'Share Capital',
    inflow: shareCapitalContributed.value,
    outflow: shareCapitalWithdrawn.value,
    net: shareCapitalBalance.value,
    route: '/share-capital',
    linkLabel: 'Share Capital'
  }
])

const sumLoanMetrics = (loans) => {
  const outstanding = loans
    .filter(l => ['approved', 'active', 'overdue'].includes(l.status))
    .reduce((sum, l) => {
      if (l.status === 'approved') return sum + parseFloat(l.loan_amount || 0)
      return sum + parseFloat(l.remaining_balance || l.loan_amount || 0)
    }, 0)
  return { count: loans.length, outstanding }
}

const statusSummaryRows = computed(() =>
  STATUS_ORDER.map(({ key, label }) => {
    const loans = filteredLoans.value.filter(l => l.status === key)
    return { status: key, label, ...sumLoanMetrics(loans) }
  }).filter(row => row.count > 0)
)

const reportScope = computed(() => {
  const parts = []
  if (isAdmin.value) {
    parts.push(filterBarangay.value ? `Barangay: ${selectedBarangayName.value}` : 'All barangays')
  } else if (userBarangayName.value) {
    parts.push(`Barangay: ${userBarangayName.value}`)
  }
  if (filterDateFrom.value || filterDateTo.value) {
    parts.push(`Period: ${filterDateFrom.value || '…'} to ${filterDateTo.value || '…'}`)
  }
  return parts.length ? parts.join(' · ') : 'All financial modules'
})

const getDeviceDate = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const getAuthHeaders = () => {
  const headers = { 'Content-Type': 'application/json' }
  if (authStore.token) headers['Authorization'] = `Bearer ${authStore.token}`
  return headers
}

const loadBarangays = async () => {
  try {
    const response = await fetch('/api/barangays')
    const data = await response.json()
    barangays.value = data.barangays || data.data || (Array.isArray(data) ? data : [])
  } catch (err) {
    console.error('Error loading barangays:', err)
  }
}

const loadAllLoans = async () => {
  try {
    const response = await fetch(`/api/loans?deviceDate=${getDeviceDate()}`, { headers: getAuthHeaders() })
    if (response.ok) {
      const data = await response.json()
      allLoans.value = data.loans || []
    }
  } catch (err) {
    console.error('Error loading loans:', err)
  }
}

const loadPaymentHistory = async () => {
  try {
    const response = await fetch('/api/loan-payments/history', { headers: getAuthHeaders() })
    if (response.ok) {
      const data = await response.json()
      paymentHistory.value = data.payments || []
    }
  } catch (err) {
    console.error('Error loading payment history:', err)
    paymentHistory.value = []
  }
}

const loadMachinerySummary = async () => {
  try {
    const userId = authStore.currentUser?.id
    if (!userId) return
    const params = new URLSearchParams({ user_id: String(userId) })
    if (filterDateFrom.value) params.set('start_date', filterDateFrom.value)
    if (filterDateTo.value) params.set('end_date', filterDateTo.value)
    if (isAdmin.value && filterBarangay.value) params.set('barangay_id', filterBarangay.value)
    const response = await fetch(`/api/machinery-financial/profit-summary?${params}`, { headers: getAuthHeaders() })
    if (response.ok) {
      const data = await response.json()
      if (data.success && data.summary) {
        machinerySummary.value = data.summary
      }
    }
  } catch (err) {
    console.error('Error loading machinery summary:', err)
  }
}

const loadShareCapitalSummary = async () => {
  if (!canViewShareCapital.value) {
    shareCapitalTotals.value = { total_farmers: 0, total_collected: 0, total_withdrawn: 0, total_balance: 0 }
    return
  }

  const targets = []
  if (isAdmin.value) {
    if (filterBarangay.value) {
      targets.push(filterBarangay.value)
    } else {
      targets.push(...barangayOptions.value.map(b => String(b.id)))
    }
  } else if (userBarangayId.value) {
    targets.push(String(userBarangayId.value))
  }

  const aggregated = { total_farmers: 0, total_collected: 0, total_withdrawn: 0, total_balance: 0 }

  for (const barangayId of targets) {
    try {
      const params = new URLSearchParams({ barangay_id: barangayId })
      const response = await fetch(`/api/share-capital/overview?${params}`, { headers: getAuthHeaders() })
      if (!response.ok) continue
      const data = await response.json()
      if (!data.success || !data.totals) continue
      aggregated.total_farmers += data.totals.total_farmers || 0
      aggregated.total_collected += parseFloat(data.totals.total_collected || 0)
      aggregated.total_withdrawn += parseFloat(data.totals.total_withdrawn || 0)
      aggregated.total_balance += parseFloat(data.totals.total_balance || 0)
    } catch (err) {
      console.error(`Error loading share capital for barangay ${barangayId}:`, err)
    }
  }

  shareCapitalTotals.value = aggregated
}

const loadAllData = async () => {
  loading.value = true
  await Promise.all([
    loadAllLoans(),
    loadPaymentHistory(),
    loadMachinerySummary(),
    loadShareCapitalSummary()
  ])
  loading.value = false
  await nextTick()
  renderCharts()
}

const clearFilters = () => {
  filterBarangay.value = ''
  filterDateFrom.value = ''
  filterDateTo.value = ''
}

const printReport = () => window.print()

const renderCharts = () => {
  renderModuleChart()
  renderMachineryChart()
}

const getChartAxisStyle = () => {
  if (isLight.value) {
    return {
      tickColor: '#000000',
      gridColor: 'rgba(0, 0, 0, 0.12)',
      legendColor: '#000000',
      doughnutBorder: '#ffffff'
    }
  }
  return {
    tickColor: '#b8dcc6',
    gridColor: 'rgba(167, 211, 178, 0.14)',
    legendColor: '#ecfdf5',
    doughnutBorder: 'rgba(236, 253, 245, 0.12)'
  }
}

const renderModuleChart = () => {
  if (!moduleChartRef.value) return
  if (moduleChart) moduleChart.destroy()

  const axis = getChartAxisStyle()
  const labels = ['Loans', 'Machinery', 'Share Capital']
  const data = [totalCollected.value, machineryIncome.value, shareCapitalContributed.value]
  const colors = ['#4ade80', '#38bdf8', '#a78bfa']

  moduleChart = new Chart(moduleChartRef.value.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderColor: axis.doughnutBorder, borderWidth: 2 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '58%',
      plugins: {
        legend: { position: 'bottom', labels: { color: axis.legendColor, boxWidth: 12, font: { size: 11 } } }
      }
    }
  })
}

const renderMachineryChart = () => {
  if (!machineryChartRef.value) return
  if (machineryChart) machineryChart.destroy()

  const axis = getChartAxisStyle()

  machineryChart = new Chart(machineryChartRef.value.getContext('2d'), {
    type: 'bar',
    data: {
      labels: ['Income', 'Expenses', 'Net'],
      datasets: [{
        data: [machineryIncome.value, machineryExpenses.value, machineryNet.value],
        backgroundColor: ['#4ade80', '#f87171', machineryNet.value >= 0 ? '#38bdf8' : '#fb923c'],
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: axis.tickColor, font: { size: 11 } }, grid: { color: axis.gridColor } },
        y: {
          ticks: { color: axis.tickColor, font: { size: 10 }, callback: (v) => '₱' + Number(v).toLocaleString() },
          grid: { color: axis.gridColor }
        }
      }
    }
  })
}

const csvEscape = (val) => {
  const str = String(val ?? '')
  return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str
}

const exportCSV = () => {
  const rows = [
    ['Financial Overview — System Summary Report'],
    ['Generated', reportGeneratedAt.value],
    ['Scope', reportScope.value],
    [],
    ['CONSOLIDATED SUMMARY'],
    ['Module', 'Inflows', 'Outflows', 'Net/Balance'],
    ...moduleSummaryRows.value.map(r => [r.label, r.inflow, r.outflow, r.net]),
    [],
    ['LOANS'],
    ['Total disbursed', totalDisbursed.value],
    ['Total collected', totalCollected.value],
    ['Outstanding', outstandingBalance.value],
    ['Overdue amount', overdueAmount.value],
    ['Overdue loans', overdueCount.value],
    ['Collection rate (%)', collectionRate.value],
    ['Active portfolio', activePortfolioCount.value],
  ]

  rows.push([], ['LOANS BY STATUS'], ['Status', 'Count', 'Outstanding'])
  rows.push(...statusSummaryRows.value.map(r => [r.label, r.count, r.outstanding]))

  rows.push(
    [],
    ['MACHINERY'],
    ['Total income', machineryIncome.value],
    ['Total expenses', machineryExpenses.value],
    ['Net profit', machineryNet.value],
    [],
    ['SHARE CAPITAL'],
    ['Members', shareCapitalMembers.value],
    ['Contributed', shareCapitalContributed.value],
    ['Withdrawn', shareCapitalWithdrawn.value],
    ['Balance', shareCapitalBalance.value]
  )

  const csv = rows.map(row => row.map(csvEscape).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `financial-overview-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  window.URL.revokeObjectURL(url)
}

watch([filterBarangay, filterDateFrom, filterDateTo], () => {
  loadMachinerySummary()
  loadShareCapitalSummary()
})

watch([filteredLoans, machinerySummary, shareCapitalTotals], async () => {
  await nextTick()
  renderCharts()
})

watch(isLight, () => {
  nextTick(() => renderCharts())
})

onMounted(async () => {
  if (isAdmin.value) await loadBarangays()
  await loadAllData()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Poppins:wght@600;700;800&display=swap');

.financial-overview-container {
  min-height: calc(100vh - 70px);
  padding: 24px 18px;
  max-width: none;
  width: 100%;
  margin: 0 auto;
  font-family: 'Inter', sans-serif;
  position: relative;
  isolation: isolate;
}

.page-header {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px;
  align-items: start;
  margin-bottom: 16px;
  padding: 18px 20px;
  background: white;
  border-radius: 14px;
  border: 1px solid #e5e7eb;
}

.page-title {
  font-size: 28px;
  font-weight: 800;
  color: #111827;
  margin: 0;
  font-family: 'Poppins', sans-serif;
}

.page-subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 6px 0 0;
  line-height: 1.5;
}

.page-note {
  font-size: 12px;
  color: #9ca3af;
  margin: 8px 0 0;
  line-height: 1.45;
}

.inline-link, .view-all-link {
  font-weight: 700;
  color: #059669;
  text-decoration: none;
  font-size: 12px;
}

.inline-link:hover, .view-all-link:hover { text-decoration: underline; }

.header-actions { display: flex; gap: 8px; flex-wrap: wrap; }

.export-btn {
  padding: 9px 16px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
}

.filters-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-end;
  margin-bottom: 16px;
  padding: 14px 16px;
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.filter-group { display: flex; flex-direction: column; gap: 4px; }
.filter-label { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; }
.filter-input {
  padding: 7px 10px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 13px;
  min-width: 130px;
}
.filter-clear-btn {
  padding: 8px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #f9fafb;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.print-only { display: none; }

.report-banner { margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb; }
.report-banner h2 { margin: 0 0 6px; font-size: 18px; }
.report-banner p { margin: 0; font-size: 12px; color: #6b7280; }
.report-footer { margin-top: 20px; font-size: 11px; color: #6b7280; line-height: 1.5; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 14px;
  border: 1px solid #e5e7eb;
}

.stat-info { text-align: center; }
.stat-label { font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; }
.stat-value { font-size: 18px; font-weight: 800; color: #111827; margin-top: 4px; font-family: 'Poppins', sans-serif; }
.stat-value.collected { color: #059669; }
.stat-value.outstanding { color: #d97706; }
.stat-value.overdue { color: #dc2626; }
.stat-value.expense { color: #dc2626; }
.stat-value.rate { color: #2563eb; }
.stat-meta { font-size: 10px; color: #9ca3af; margin-top: 2px; }

.charts-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.chart-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 16px;
}

.chart-title { font-size: 14px; font-weight: 800; color: #111827; margin: 0 0 10px; text-align: center; }
.chart-canvas-wrap { height: 220px; position: relative; }

.financial-table-section {
  background: white;
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid #e5e7eb;
}

.module-section { margin-top: 4px; }

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.section-title { font-size: 16px; font-weight: 800; color: #111827; margin: 0; }

.financial-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 12px;
}

.financial-table:last-child { margin-bottom: 0; }

.financial-table th,
.financial-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid #f3f4f6;
  font-size: 13px;
}

.financial-table th {
  background: #f9fafb;
  font-weight: 700;
  color: #6b7280;
  font-size: 11px;
  text-transform: uppercase;
}

.sub-table { margin-top: 8px; }

.financial-table .amount { font-weight: 700; }
.financial-table .collected { color: #059669; font-weight: 700; }
.financial-table .outstanding { color: #d97706; font-weight: 700; }
.financial-table .overdue { color: #dc2626; font-weight: 700; }
.financial-table .expense { color: #dc2626; font-weight: 700; }
.financial-table .rate { color: #2563eb; font-weight: 700; }
.financial-table .loading-cell { text-align: center; color: #9ca3af; font-style: italic; }

@media print {
  .no-print { display: none !important; }
  .print-only { display: block !important; }
  .financial-overview-container { background: #fff !important; color: #111 !important; padding: 0 !important; }
  .stat-card, .chart-card, .financial-table-section { break-inside: avoid; box-shadow: none !important; border: 1px solid #ddd !important; background: #fff !important; }
}

@media (max-width: 768px) {
  .page-header { grid-template-columns: 1fr; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}

/* Glass theme — dark mode only */
.financial-overview-container:not(.light-theme) {
  background: linear-gradient(145deg, #0f1712 0%, #132119 22%, #1a2b20 45%, #243b2c 72%, #2f4a38 100%) !important;
  color: #eefde6;
  border-radius: 18px;
}

.financial-overview-container:not(.light-theme) :is(.page-header, .filters-bar, .stat-card, .financial-table-section) {
  background: rgba(28, 42, 33, 0.92) !important;
  border: 1px solid rgba(190, 235, 203, 0.14) !important;
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.30), inset 1px 1px 0 rgba(255,255,255,0.05) !important;
}

.financial-overview-container:not(.light-theme) :is(.page-title, .section-title) { color: #eefde6 !important; }
.financial-overview-container:not(.light-theme) :is(.page-subtitle, .stat-label, .filter-label) { color: rgba(220, 238, 211, 0.72) !important; }
.financial-overview-container:not(.light-theme) .page-note { color: rgba(220, 238, 211, 0.62) !important; }
.financial-overview-container:not(.light-theme) .stat-value { color: #eefde6 !important; }
.financial-overview-container:not(.light-theme) .stat-value.collected { color: #86efac !important; }
.financial-overview-container:not(.light-theme) .stat-value.outstanding { color: #fcd34d !important; }
.financial-overview-container:not(.light-theme) .stat-value.overdue,
.financial-overview-container:not(.light-theme) .stat-value.expense { color: #fca5a5 !important; }
.financial-overview-container:not(.light-theme) .stat-value.rate { color: #93c5fd !important; }

.financial-overview-container:not(.light-theme) :is(.filter-input, .filter-clear-btn) {
  background: rgba(0,0,0,0.24) !important;
  color: #eefde6 !important;
  border-color: rgba(190, 235, 203, 0.24) !important;
}

.financial-overview-container:not(.light-theme) :is(.inline-link, .view-all-link) { color: #86efac !important; }

.financial-overview-container:not(.light-theme) .financial-table th {
  background: rgba(34, 55, 44, 0.95) !important;
  color: #b6f7cb !important;
}

.financial-overview-container:not(.light-theme) .financial-table td {
  color: rgba(238, 253, 230, 0.92) !important;
  border-bottom-color: rgba(255,255,255,0.06) !important;
}

.financial-overview-container:not(.light-theme) .financial-table .collected { color: #86efac !important; }
.financial-overview-container:not(.light-theme) .financial-table .outstanding { color: #fcd34d !important; }
.financial-overview-container:not(.light-theme) .financial-table .overdue,
.financial-overview-container:not(.light-theme) .financial-table .expense { color: #fca5a5 !important; }
.financial-overview-container:not(.light-theme) .financial-table .rate { color: #93c5fd !important; }

.financial-overview-container:not(.light-theme) .export-btn {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.25), rgba(34, 197, 94, 0.14)) !important;
  color: #dcfce7 !important;
  border: 1px solid rgba(74, 222, 128, 0.34) !important;
}

.financial-overview-container:not(.light-theme) .chart-card {
  background: rgba(28, 42, 33, 0.92) !important;
  border: 1px solid rgba(190, 235, 203, 0.14) !important;
}

.financial-overview-container:not(.light-theme) .chart-title {
  color: #eefde6 !important;
}

/* ===== LIGHT MODE — Senior-friendly bright theme ===== */
.financial-overview-container.light-theme {
  background: linear-gradient(160deg, #f7fdf9 0%, #f0fdf4 45%, #e8f8ec 100%) !important;
  color: #052e16;
  border-radius: 18px;
}

.financial-overview-container.light-theme :is(.page-header, .filters-bar, .stat-card, .financial-table-section, .chart-card) {
  background: #ffffff !important;
  border: 2px solid #86efac !important;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1) !important;
}

.financial-overview-container.light-theme .page-title,
.financial-overview-container.light-theme .section-title,
.financial-overview-container.light-theme .chart-title {
  color: #052e16 !important;
  background: none !important;
  -webkit-background-clip: border-box !important;
  background-clip: border-box !important;
  -webkit-text-fill-color: currentColor !important;
}

.financial-overview-container.light-theme :is(.page-subtitle, .stat-label, .filter-label, .stat-meta) {
  color: #166534 !important;
}

.financial-overview-container.light-theme .page-note {
  color: #15803d !important;
}

.financial-overview-container.light-theme .stat-value {
  color: #052e16 !important;
}

.financial-overview-container.light-theme .stat-value.collected {
  color: #15803d !important;
}

.financial-overview-container.light-theme .stat-value.outstanding {
  color: #b45309 !important;
}

.financial-overview-container.light-theme .stat-value.overdue,
.financial-overview-container.light-theme .stat-value.expense {
  color: #dc2626 !important;
}

.financial-overview-container.light-theme .stat-value.rate {
  color: #2563eb !important;
}

.financial-overview-container.light-theme :is(.filter-input, .filter-clear-btn) {
  background: #ffffff !important;
  color: #052e16 !important;
  border: 1.5px solid #cbd5e1 !important;
}

.financial-overview-container.light-theme .filter-clear-btn {
  background: #f0fdf4 !important;
  border-color: #86efac !important;
  color: #166534 !important;
}

.financial-overview-container.light-theme :is(.inline-link, .view-all-link) {
  color: #15803d !important;
}

.financial-overview-container.light-theme .export-btn {
  background: linear-gradient(135deg, #22c55e, #16a34a) !important;
  color: #ffffff !important;
  border: none !important;
}

.financial-overview-container.light-theme .financial-table th {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%) !important;
  color: #052e16 !important;
  border-bottom: 1px solid #86efac !important;
}

.financial-overview-container.light-theme .financial-table td {
  color: #14532d !important;
  border-bottom-color: #e2e8f0 !important;
}

.financial-overview-container.light-theme .financial-table tbody tr:nth-child(even) td {
  background: #f8fdf9 !important;
}

.financial-overview-container.light-theme .financial-table tbody tr:hover td {
  background: #ecfdf5 !important;
}

.financial-overview-container.light-theme .financial-table .collected {
  color: #15803d !important;
}

.financial-overview-container.light-theme .financial-table .outstanding {
  color: #b45309 !important;
}

.financial-overview-container.light-theme .financial-table .overdue,
.financial-overview-container.light-theme .financial-table .expense {
  color: #dc2626 !important;
}

.financial-overview-container.light-theme .financial-table .rate {
  color: #2563eb !important;
}

.financial-overview-container.light-theme .financial-table .loading-cell {
  color: #166534 !important;
}
</style>
