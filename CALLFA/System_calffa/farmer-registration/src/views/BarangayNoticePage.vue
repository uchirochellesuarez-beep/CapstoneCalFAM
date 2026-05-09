<template>
  <div class="barangay-notice-page">
    <!-- Header -->
    <div class="notice-container">
      <div class="notice-card">
        <!-- Icon -->
        <div class="notice-icon">🏢</div>
        
        <!-- Title -->
        <h1 class="notice-title">{{ userBarangay }} Barangay</h1>
        
        <!-- Status Badge -->
        <div class="status-badge scoped">{{ statusLabel }}</div>
        
        <!-- Message -->
        <div class="notice-message">
          <p class="primary-message">
            <strong>{{ primaryHeadline }}</strong>
          </p>
          <p class="secondary-message">
            {{ message }}
          </p>
        </div>
        
        <!-- Features Status -->
        <div class="features-section">
          <h2 class="features-title">{{ language === 'tl' ? 'Mga feature (barangay mo lang)' : 'Features (your barangay only)' }}</h2>
          <div class="features-list">
            <div class="feature-item available">
              <span class="feature-icon">💰</span>
              <span class="feature-name">{{ language === 'tl' ? 'Mga Savings' : 'Savings' }}</span>
              <span class="status-label ok">{{ language === 'tl' ? 'Available' : 'Available' }}</span>
            </div>
            <div class="feature-item available">
              <span class="feature-icon">📋</span>
              <span class="feature-name">{{ language === 'tl' ? 'Mga Loan' : 'Loans' }}</span>
              <span class="status-label ok">{{ language === 'tl' ? 'Available' : 'Available' }}</span>
            </div>
            <div class="feature-item available">
              <span class="feature-icon">📈</span>
              <span class="feature-name">{{ language === 'tl' ? 'Share Capital' : 'Share Capital' }}</span>
              <span class="status-label ok">{{ language === 'tl' ? 'Available' : 'Available' }}</span>
            </div>
            <div class="feature-item available">
              <span class="feature-icon">🌾</span>
              <span class="feature-name">{{ language === 'tl' ? 'Kita ng Magsasaka' : 'Farmer Income' }}</span>
              <span class="status-label ok">{{ language === 'tl' ? 'Available' : 'Available' }}</span>
            </div>
            <div class="feature-item available">
              <span class="feature-icon">⚙️</span>
              <span class="feature-name">{{ language === 'tl' ? 'Machinery' : 'Machinery' }}</span>
              <span class="status-label ok">{{ language === 'tl' ? 'Available' : 'Available' }}</span>
            </div>
            <div class="feature-item available">
              <span class="feature-icon">📊</span>
              <span class="feature-name">{{ language === 'tl' ? 'Financial Overview' : 'Financial Overview' }}</span>
              <span class="status-label ok">{{ language === 'tl' ? 'Available' : 'Available' }}</span>
            </div>
          </div>
          <p class="features-footnote">{{ featuresFootnote }}</p>
        </div>
        
        <!-- Info Box -->
        <div class="info-box">
          <div class="info-icon">ℹ️</div>
          <div class="info-content">
            <p class="info-title">{{ language === 'tl' ? 'Ano ang Susunod?' : 'What\'s Next?' }}</p>
            <p class="info-text">
              {{ nextStepMessage }}
            </p>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="action-buttons">
          <button type="button" @click="goToDashboard" class="btn btn-primary">
            <span class="btn-icon">🏠</span>
            {{ language === 'tl' ? 'Pumunta sa Dashboard' : 'Go to Dashboard' }}
          </button>
          <button type="button" @click="logout" class="btn btn-secondary">
            <span class="btn-icon">🚪</span>
            {{ language === 'tl' ? 'Mag-logout' : 'Logout' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

const language = ref('en')

const userBarangay = computed(() => {
  return authStore.currentUser?.barangay_name || 'Unknown'
})

const statusLabel = computed(() => {
  return language.value === 'tl' ? 'Portal ng iyong barangay' : 'Your barangay portal'
})

const primaryHeadline = computed(() => {
  return language.value === 'tl'
    ? 'Maligayang pagdating!'
    : 'Welcome!'
})

const message = computed(() => {
  if (language.value === 'tl') {
    return `Ikaw ay nakatala sa ${userBarangay.value}. Parehong mga uri ng transaction at module ang makukuha ng bawat barangay—pero nakasara ang datos: makikita at magagamit mo lang ang impormasyon at transaksyon na kabilang sa barangay mo, hindi ng ibang komunidad.`
  }
  return `You are registered under ${userBarangay.value}. Each barangay uses the same transaction modules—but data is scoped: you only see and work with records for your barangay, not other communities.`
})

const featuresFootnote = computed(() => {
  return language.value === 'tl'
    ? 'Ipinapakita sa sidebar ang eksaktong menu batay sa iyong role.'
    : 'The sidebar shows only the menus for your role; all scoped data stays within your barangay.'
})

const nextStepMessage = computed(() => {
  if (language.value === 'tl') {
    return `Pumunta sa dashboard para gamitin ang mga feature ayon sa iyong role. Tandaan: lahat ng listahan at ulat ay naka-limit sa iyong barangay lamang (${userBarangay.value}), maliban kung isa kang admin ng buong sistema.`
  }
  return `Continue to your dashboard to use features available to your role. Lists and reports are limited to your barangay (${userBarangay.value}) unless you are a cooperative-wide administrator.`
})

const goToDashboard = () => {
  router.push('/dashboard')
}

const logout = () => {
  authStore.logout()
  router.push('/login')
}

onMounted(() => {
  if (!authStore.currentUser) {
    router.push('/login')
    return
  }
  const u = authStore.currentUser
  if (u.role === 'admin' || u.barangay_id == null) {
    router.push('/dashboard')
  }
})
</script>

<style scoped>
.barangay-notice-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.notice-container {
  width: 100%;
  max-width: 600px;
}

.notice-card {
  background: white;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideDown 0.5s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.notice-icon {
  font-size: 60px;
  text-align: center;
  margin-bottom: 20px;
}

.notice-title {
  font-size: 28px;
  font-weight: 700;
  color: #333;
  text-align: center;
  margin-bottom: 15px;
}

.status-badge {
  display: inline-block;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  margin: 0 auto 20px;
  display: block;
  width: fit-content;
}

.status-badge.scoped {
  background-color: #e8f5e9;
  color: #1b5e20;
  border: 1px solid #a5d6a7;
}

.notice-message {
  background: #f8f9fa;
  border-left: 4px solid #43a047;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 25px;
}

.primary-message {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 16px;
}

.secondary-message {
  margin: 0;
  color: #666;
  font-size: 14px;
  line-height: 1.6;
}

.features-section {
  margin-bottom: 30px;
}

.features-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 15px;
}

.features-footnote {
  margin: 12px 0 0;
  font-size: 12px;
  color: #666;
  line-height: 1.45;
}

.features-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  text-align: center;
  transition: all 0.3s ease;
}

.feature-item.available {
  background-color: #f1f8f4;
  border-color: #c8e6c9;
}

.feature-item:hover {
  border-color: #81c784;
}

.feature-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.feature-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  margin-bottom: 6px;
}

.status-label {
  font-size: 11px;
  font-weight: 600;
}

.status-label.ok {
  color: #2e7d32;
}

.info-box {
  display: flex;
  gap: 15px;
  background: #e3f2fd;
  border-left: 4px solid #2196f3;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 25px;
}

.info-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.info-content {
  flex: 1;
}

.info-title {
  font-weight: 600;
  color: #1565c0;
  margin: 0 0 5px 0;
  font-size: 14px;
}

.info-text {
  color: #0d47a1;
  font-size: 13px;
  margin: 0;
  line-height: 1.5;
}

.action-buttons {
  display: flex;
  gap: 12px;
  flex-direction: column;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #f5f5f5;
  color: #333;
  border: 1px solid #d0d0d0;
}

.btn-secondary:hover {
  background: #eeeeee;
  border-color: #999;
}

.btn-icon {
  font-size: 16px;
}

@media (max-width: 600px) {
  .notice-card {
    padding: 25px;
  }

  .notice-title {
    font-size: 22px;
  }

  .features-list {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
