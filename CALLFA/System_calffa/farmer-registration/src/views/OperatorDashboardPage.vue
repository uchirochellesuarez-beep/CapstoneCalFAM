<template>
  <div class="page-container glass-module-page operator-dashboard-page">
    <div v-if="!isOperator" class="access-denied-card">
      <h2>Access Denied</h2>
      <p>This dashboard is only available for machinery operators.</p>
    </div>

    <template v-else>
      <div class="page-header glass-header">
        <h1 class="page-title">Operator Dashboard</h1>
        <p class="page-subtitle">Your assigned machinery, bookings, and income at a glance</p>
      </div>

      <div v-if="loading" class="loading-state">Loading dashboard...</div>

      <template v-else>
        <div class="stats-grid">
          <div class="stat-card income">
            <div class="stat-value">₱{{ formatMoney(summary.total_earnings) }}</div>
            <div class="stat-label">Total Earnings</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">₱{{ formatMoney(summary.monthly_earnings) }}</div>
            <div class="stat-label">This Month</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">₱{{ formatMoney(summary.yearly_earnings) }}</div>
            <div class="stat-label">This Year</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ summary.total_completed_transactions || 0 }}</div>
            <div class="stat-label">Completed Transactions</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ upcomingBookings.length }}</div>
            <div class="stat-label">Upcoming Bookings</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ activeBookings.length }}</div>
            <div class="stat-label">Active Bookings</div>
          </div>
        </div>

        <div class="dashboard-grid">
          <section class="card section-card">
            <h2 class="card-title">Assigned Machinery</h2>
            <div v-if="assignedMachinery.length === 0" class="empty-state">No machinery assigned yet.</div>
            <div v-else class="machinery-list">
              <div v-for="m in assignedMachinery" :key="m.id" class="machinery-item">
                <div>
                  <strong>{{ m.machinery_name }}</strong>
                  <span class="badge">{{ m.machinery_type }}</span>
                </div>
                <span :class="['status-badge', statusClass(m.status)]">{{ m.status }}</span>
              </div>
            </div>
          </section>

          <section class="card section-card">
            <h2 class="card-title">Upcoming Bookings</h2>
            <booking-mini-list :bookings="upcomingBookings" empty-text="No upcoming bookings." />
          </section>

          <section class="card section-card">
            <h2 class="card-title">Active Bookings</h2>
            <booking-mini-list :bookings="activeBookings" empty-text="No active bookings." />
          </section>

          <section class="card section-card">
            <h2 class="card-title">Completed Bookings</h2>
            <booking-mini-list :bookings="completedBookings" empty-text="No completed bookings yet." />
          </section>

          <section class="card section-card">
            <h2 class="card-title">Incomplete Bookings</h2>
            <booking-mini-list :bookings="incompleteBookings" empty-text="No incomplete bookings." />
          </section>

          <section class="card section-card wide-card">
            <h2 class="card-title">Recent Transactions</h2>
            <div v-if="recentTransactions.length === 0" class="empty-state">No income transactions yet.</div>
            <table v-else class="mini-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Booking</th>
                  <th>Machinery</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="tx in recentTransactions" :key="tx.id">
                  <td>{{ formatDate(tx.transaction_date) }}</td>
                  <td>#{{ tx.booking_id }}</td>
                  <td>{{ tx.machinery_name }}</td>
                  <td class="amount">₱{{ formatMoney(tx.labor_cost_amount) }}</td>
                  <td><span class="status-badge status-credited">{{ tx.income_status }}</span></td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>

        <section class="card section-card income-section">
          <div class="section-header-row">
            <h2 class="card-title">Income History</h2>
            <router-link to="/machinery-approval" class="link-btn">Manage Bookings →</router-link>
          </div>

          <div class="filters-row">
            <div class="form-group">
              <label>Start Date</label>
              <input v-model="incomeFilters.start_date" type="date" class="form-input" @change="loadIncome" />
            </div>
            <div class="form-group">
              <label>End Date</label>
              <input v-model="incomeFilters.end_date" type="date" class="form-input" @change="loadIncome" />
            </div>
            <div class="form-group">
              <label>Machinery</label>
              <select v-model="incomeFilters.machinery_id" class="form-input" @change="loadIncome">
                <option value="">All Machinery</option>
                <option v-for="m in assignedMachinery" :key="m.id" :value="m.id">{{ m.machinery_name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Booking Status</label>
              <select v-model="incomeFilters.booking_status" class="form-input" @change="loadIncome">
                <option value="">All</option>
                <option value="Completed">Completed</option>
                <option value="Incomplete">Incomplete</option>
              </select>
            </div>
          </div>

          <div v-if="earningsPerMachinery.length" class="earnings-per-machinery">
            <h3>Earnings Per Machinery</h3>
            <div class="earnings-chips">
              <div v-for="row in earningsPerMachinery" :key="row.machinery_id" class="earnings-chip">
                <span class="chip-name">{{ row.machinery_name }}</span>
                <span class="chip-amount">₱{{ formatMoney(row.total_earnings) }}</span>
                <small>{{ row.transaction_count }} tx</small>
              </div>
            </div>
          </div>

          <div v-if="incomeHistory.length === 0" class="empty-state">No income records match your filters.</div>
          <table v-else class="income-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Booking</th>
                <th>Machinery</th>
                <th>Farmer</th>
                <th>Labor Cost</th>
                <th>Booking Status</th>
                <th>Income Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in incomeHistory" :key="row.id">
                <td>{{ formatDate(row.transaction_date) }}</td>
                <td>#{{ row.booking_id }}</td>
                <td>{{ row.machinery_name }}</td>
                <td>{{ row.farmer_name || '—' }}</td>
                <td class="amount">₱{{ formatMoney(row.labor_cost_amount) }}</td>
                <td>{{ row.booking_status || '—' }}</td>
                <td>{{ row.income_status }}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </template>
    </template>
  </div>
</template>

<script>
import { ref, computed, onMounted, defineComponent, h } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useMachineryStore } from '../stores/machineryStore'

const BookingMiniList = defineComponent({
  name: 'BookingMiniList',
  props: {
    bookings: { type: Array, default: () => [] },
    emptyText: { type: String, default: 'No bookings.' }
  },
  setup(props) {
    const formatDate = (d) => {
      if (!d) return '—'
      return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
    }
    return () => {
      if (!props.bookings.length) {
        return h('div', { class: 'empty-state' }, props.emptyText)
      }
      return h(
        'div',
        { class: 'booking-mini-list' },
        props.bookings.map((b) =>
          h('div', { class: 'booking-mini-item', key: b.id }, [
            h('div', { class: 'booking-mini-main' }, [
              h('strong', `#${b.id} — ${b.machinery_name}`),
              h('span', { class: 'booking-mini-farmer' }, b.farmer_name)
            ]),
            h('div', { class: 'booking-mini-meta' }, [
              h('span', formatDate(b.booking_date)),
              h('span', { class: `status-badge status-${String(b.status || '').toLowerCase()}` }, b.status)
            ])
          ])
        )
      )
    }
  }
})

export default {
  name: 'OperatorDashboardPage',
  components: { BookingMiniList },
  setup() {
    const authStore = useAuthStore()
    const machineryStore = useMachineryStore()

    const loading = ref(true)
    const assignedMachinery = ref([])
    const upcomingBookings = ref([])
    const activeBookings = ref([])
    const completedBookings = ref([])
    const incompleteBookings = ref([])
    const recentTransactions = ref([])
    const incomeHistory = ref([])
    const earningsPerMachinery = ref([])
    const summary = ref({
      total_earnings: 0,
      monthly_earnings: 0,
      yearly_earnings: 0,
      total_completed_transactions: 0
    })

    const incomeFilters = ref({
      start_date: '',
      end_date: '',
      machinery_id: '',
      booking_status: ''
    })

    const isOperator = computed(() => authStore.currentUser?.role === 'operator')

    const formatMoney = (v) => Number(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const formatDate = (d) => {
      if (!d) return '—'
      return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
    }
    const statusClass = (status) => {
      const map = { Available: 'available', 'In Use': 'in-use', 'Under Maintenance': 'maintenance', Unavailable: 'unavailable' }
      return `status-${map[status] || 'unknown'}`
    }

    const loadDashboard = async () => {
      loading.value = true
      try {
        const data = await machineryStore.fetchOperatorDashboard()
        assignedMachinery.value = data.assigned_machinery || []
        upcomingBookings.value = data.upcoming_bookings || []
        activeBookings.value = data.active_bookings || []
        completedBookings.value = data.completed_bookings || []
        incompleteBookings.value = data.incomplete_bookings || []
        recentTransactions.value = data.recent_transactions || []
        summary.value = data.income_summary || summary.value
        earningsPerMachinery.value = data.earnings_per_machinery || []
      } finally {
        loading.value = false
      }
    }

    const loadIncome = async () => {
      const filters = {}
      Object.entries(incomeFilters.value).forEach(([k, v]) => { if (v) filters[k] = v })
      const data = await machineryStore.fetchOperatorIncome(filters)
      incomeHistory.value = data.income || []
      if (data.summary) summary.value = { ...summary.value, ...data.summary }
      if (data.earnings_per_machinery) earningsPerMachinery.value = data.earnings_per_machinery
    }

    onMounted(async () => {
      if (!isOperator.value) return
      await loadDashboard()
      await loadIncome()
    })

    return {
      loading, isOperator, assignedMachinery, upcomingBookings, activeBookings,
      completedBookings, incompleteBookings, recentTransactions, incomeHistory,
      earningsPerMachinery, summary, incomeFilters,
      formatMoney, formatDate, statusClass, loadIncome
    }
  }
}
</script>

<style scoped>
.operator-dashboard-page { padding-bottom: 2rem; }
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.stat-card {
  background: rgba(255,255,255,0.85);
  border-radius: 12px;
  padding: 1rem;
  border: 1px solid rgba(0,0,0,0.06);
}
.stat-card.income { border-color: #2e7d32; background: linear-gradient(135deg, #f1f8e9, #fff); }
.stat-value { font-size: 1.35rem; font-weight: 700; color: #1b5e20; }
.stat-label { font-size: 0.85rem; color: #555; margin-top: 0.25rem; }
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.section-card { padding: 1rem 1.25rem; }
.wide-card { grid-column: 1 / -1; }
.card-title { margin: 0 0 1rem; font-size: 1.05rem; }
.machinery-list, .booking-mini-list { display: flex; flex-direction: column; gap: 0.65rem; }
.machinery-item, .booking-mini-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.65rem 0.75rem; border-radius: 8px; background: #f8faf8; border: 1px solid #e8efe8;
}
.booking-mini-main { display: flex; flex-direction: column; gap: 0.15rem; }
.booking-mini-farmer { font-size: 0.82rem; color: #666; }
.booking-mini-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 0.25rem; font-size: 0.82rem; }
.badge { margin-left: 0.5rem; font-size: 0.75rem; padding: 0.1rem 0.45rem; border-radius: 999px; background: #e3f2fd; color: #1565c0; }
.status-badge { font-size: 0.75rem; padding: 0.15rem 0.5rem; border-radius: 999px; background: #eee; }
.status-available { background: #e8f5e9; color: #2e7d32; }
.status-approved { background: #e3f2fd; color: #1565c0; }
.status-completed { background: #f3e5f5; color: #6a1b9a; }
.status-incomplete { background: #fff3e0; color: #e65100; }
.status-credited { background: #e8f5e9; color: #2e7d32; }
.empty-state { color: #777; font-size: 0.9rem; padding: 0.5rem 0; }
.mini-table, .income-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
.mini-table th, .mini-table td, .income-table th, .income-table td {
  padding: 0.5rem 0.65rem; border-bottom: 1px solid #eee; text-align: left;
}
.amount { font-weight: 600; color: #2e7d32; }
.income-section { margin-top: 0.5rem; }
.section-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.link-btn { color: #1565c0; text-decoration: none; font-size: 0.9rem; }
.filters-row { display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem; }
.form-group { display: flex; flex-direction: column; gap: 0.25rem; min-width: 140px; }
.form-input { padding: 0.45rem 0.6rem; border: 1px solid #ccc; border-radius: 6px; }
.earnings-per-machinery { margin-bottom: 1rem; }
.earnings-per-machinery h3 { font-size: 0.95rem; margin: 0 0 0.5rem; }
.earnings-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.earnings-chip {
  background: #f1f8e9; border: 1px solid #c8e6c9; border-radius: 8px;
  padding: 0.5rem 0.75rem; display: flex; flex-direction: column; min-width: 120px;
}
.chip-name { font-weight: 600; font-size: 0.85rem; }
.chip-amount { color: #2e7d32; font-weight: 700; }
.loading-state { padding: 2rem; text-align: center; color: #666; }
.access-denied-card { padding: 2rem; text-align: center; }
</style>
