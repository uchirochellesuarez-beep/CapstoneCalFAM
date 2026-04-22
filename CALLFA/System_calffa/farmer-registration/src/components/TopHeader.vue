<template>
  <header class="top-header">
    <div class="backdrop-header backdrop-theme"></div>
    <div class="header-content">
      <!-- Center: System Status & Timestamp -->
      <div class="system-info">
        <div class="status-indicator" :class="{ active: systemStatus }">
          <span class="status-dot"></span>
          <span class="status-text">{{ systemStatus ? 'System Active' : 'System Inactive' }}</span>
        </div>
        <div class="timestamp">
          <span class="time-icon">🕐</span>
          <span class="time-text">{{ currentTime }}</span>
        </div> 
      </div>

      <!-- Right: User Controls -->
      <div class="user-controls">
        <!-- Notifications -->
        <div class="notification-container">
          <button class="icon-btn notification-btn" @click="toggleNotifications">
            <span class="icon">🔔</span>
            <span v-if="notificationCount > 0" class="badge">{{ notificationCount }}</span>
          </button>
        </div>

        <!-- Logout -->
        <button class="icon-btn logout-btn" @click="handleLogout" title="Logout">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            class="logout-icon"
          >
            <path
              d="M9 21H5C4.44772 21 4 20.5523 4 20V4C4 3.44772 4.44772 3 5 3H9"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M16 17L21 12L16 7"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M21 12H9"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        <!-- User Profile -->
        <div class="user-profile" @click="goToSettings" title="Edit Profile">
          <img :src="userAvatar" class="profile-avatar" alt="User Avatar" />
          <div class="profile-info">
            <div class="profile-name">{{ userName }}</div>
            <div class="profile-id">ID: {{ userId }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Notifications Modal (teleported to body to center on page) -->
    <Teleport to="body">
      <div v-if="showNotifications" class="notifications-modal-overlay" @click="showNotifications = false">
        <div class="notifications-modal" @click.stop ref="notificationsRef">
          <div class="notifications-header">
            <h3>Notifications</h3>
            <div class="notifications-header-actions">
              <button v-if="unreadCount > 0" class="mark-read-btn" @click="markAllAsRead">Mark all read</button>
              <button class="modal-close" @click="showNotifications = false">&times;</button>
            </div>
          </div>

          <div class="notifications-list">
            <div 
              v-for="notification in notifications" 
              :key="notification.id"
              class="notification-item"
              :class="{ unread: !notification.is_read }"
              @click="handleNotificationClick(notification)"
            >
              <div class="notification-icon">{{ notification.icon }}</div>
              <div class="notification-content">
                <div class="notification-title">{{ notification.title }}</div>
                <div class="notification-message">{{ notification.message }}</div>
                <div class="notification-date">{{ formatNotificationDate(notification.trigger_date) }}</div>
              </div>
              <div v-if="!notification.is_read" class="unread-indicator"></div>
            </div>
            <div v-if="notifications.length === 0" class="no-notifications">
              <span class="empty-icon">✅</span>
              <span>All caught up!</span>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Logout Confirmation Modal (teleported to body to avoid parent transform breaking fixed positioning) -->
    <Teleport to="body">
      <div v-if="showLogoutConfirm" class="logout-modal-overlay" @click="showLogoutConfirm = false">
        <div class="logout-modal" @click.stop>
          <div class="modal-header">
            <h3>Confirm Logout</h3>
            <button class="modal-close" @click="showLogoutConfirm = false">&times;</button>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to logout?</p>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="showLogoutConfirm = false">No, Stay</button>
            <button class="btn-logout" @click="confirmLogout">Yes, Logout</button>
          </div>
        </div>
      </div>
    </Teleport>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

const systemStatus = ref(true)
const currentTime = ref('')
const showNotifications = ref(false)
const notificationsRef = ref(null)
const showLogoutConfirm = ref(false)

// Unified notifications array (Facebook-style)
const notifications = ref([])
const unreadCount = ref(0)

// Role check
const userRole = computed(() => authStore.currentUser?.role)
const isAdminRole = computed(() => ['admin', 'treasurer', 'president'].includes(userRole.value))

const userName = computed(() => authStore.currentUser?.full_name || 'Juan Dela Cruz')
const userId = computed(() => authStore.currentUser?.reference_number || 'CALFFA-00123')

const userInitials = computed(() => {
  const name = userName.value
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
})

const userAvatar = computed(() => {
  // Use actual profile picture if available, otherwise generate initials avatar
  if (authStore.currentUser?.profile_picture) {
    const profilePicture = authStore.currentUser.profile_picture
    // Check if it's already a full URL (Google profile pictures start with https://)
    if (profilePicture.startsWith('http://') || profilePicture.startsWith('https://')) {
      return profilePicture
    }
    // For local uploads (starts with /uploads/), return as-is
    // The /uploads path is proxied to the backend via Vite in development
    // and served directly by the backend in production
    return profilePicture
  }
  // Fallback to generated initials avatar if no profile picture
  return (
    "https://ui-avatars.com/api/?name=" +
    encodeURIComponent(userName.value) +
    "&background=4CAF50&color=fff&size=128"
  )
})

// ─── Unified Notifications (Due date + System) ───
const notificationCount = computed(() => unreadCount.value)

const getAuthHeaders = () => {
  const token = authStore.token || localStorage.getItem('token')
  const hasToken = !!token
  
  if (!hasToken) {
    console.warn('⚠️ No token found in authStore or localStorage')
    console.log('authStore.token:', authStore.token ? 'exists' : 'null')
    console.log('localStorage.token:', localStorage.getItem('token') ? 'exists' : 'null')
  }
  
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

// Load all due-date notifications
const loadNotifications = async () => {
  try {
    const headers = { ...getAuthHeaders(), 'Content-Type': 'application/json' }
    if (!headers.Authorization) {
      console.warn('⚠️ [loadNotifications] No authorization token available')
      return
    }

    console.log('📬 [loadNotifications] Fetching notifications with token...')
    console.log('🔐 Token preview:', headers.Authorization.substring(0, 30) + '...')

    const [notifRes, countRes] = await Promise.all([
      fetch('/api/notifications', { method: 'GET', headers }),
      fetch('/api/notifications/unread-count', { method: 'GET', headers })
    ])

    if (!notifRes.ok) {
      const responseText = await notifRes.text()
      console.error(`❌ [/api/notifications] Status: ${notifRes.status} ${notifRes.statusText}`)
      console.error('Response:', responseText.substring(0, 200))
      if (notifRes.status === 401) {
        console.error('🔐 Authentication failed - Please login again')
        authStore.logout()
        router.push('/login')
      }
      return
    }

    if (!countRes.ok) {
      console.error(`❌ [/api/notifications/unread-count] Status: ${countRes.status}`)
      return
    }

    const data = await notifRes.json()
    const notifs = data.notifications || []
    
    // Transform to unified format with icons
    notifications.value = notifs.map(n => ({
      ...n,
      icon: getNotificationIcon(n.reference_type)
    }))
    
    console.log(`✅ [loadNotifications] Loaded ${notifs.length} notifications`)

    const countData = await countRes.json()
    unreadCount.value = countData.count || 0
  } catch (error) {
    console.error('❌ [loadNotifications] Exception:', error)
  }
}

const getNotificationIcon = (referenceType) => {
  const icons = {
    'loan': '💰',
    'machinery_booking': '🚜'
  }
  return icons[referenceType] || '🔔'
}

const formatNotificationDate = (dateStr) => {
  if (!dateStr) return 'No date'
  
  try {
    let d;
    
    // Handle string dates
    if (typeof dateStr === 'string') {
      // Remove time portion if present
      const dateOnly = dateStr.split('T')[0]
      
      // Parse YYYY-MM-DD format
      if (dateOnly.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateOnly.split('-').map(Number)
        d = new Date(year, month - 1, day, 0, 0, 0, 0)
      } else {
        d = new Date(dateStr)
      }
    } else {
      d = new Date(dateStr)
    }
    
    // Validate date
    if (isNaN(d.getTime())) {
      console.warn('⚠️ Invalid date:', dateStr)
      return dateStr ? dateStr.substring(0, 10) : 'Invalid date'
    }
    
    // Calculate difference using only date parts (no time component)
    const now = new Date()
    const todayMs = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
    const notifMs = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
    const diffDays = Math.round((notifMs - todayMs) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays === -1) return 'Yesterday'
    if (diffDays > 0 && diffDays < 7) return `In ${diffDays} days`
    if (diffDays < 0 && diffDays > -7) return `${Math.abs(diffDays)} days ago`
    
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch (err) {
    console.error('Error formatting notification date:', err)
    return dateStr ? String(dateStr).substring(0, 10) : 'Invalid date'
  }
}

// ─── Click handler: mark as read and navigate ───
const handleNotificationClick = async (notification) => {
  // Mark as read
  try {
    const headers = { ...getAuthHeaders(), 'Content-Type': 'application/json' }
    const response = await fetch(`/api/notifications/${notification.id}/read`, { method: 'PUT', headers })
    if (!response.ok) {
      console.error(`Failed to mark notification as read: ${response.status}`)
      return
    }
    notification.is_read = 1
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  } catch (e) {
    console.error('Error marking notification read:', e)
    return
  }

  showNotifications.value = false

  // Navigate based on reference type
  if (notification.reference_type === 'loan') {
    const role = authStore.currentUser?.role
    if (['admin', 'treasurer', 'president'].includes(role)) {
      router.push({ path: '/admin-loans', query: { highlight: notification.reference_id, type: 'loan' } })
    } else {
      router.push({ path: '/loan', query: { highlight: notification.reference_id, type: 'loan' } })
    }
  } else if (notification.reference_type === 'machinery_booking') {
    const role = authStore.currentUser?.role
    if (['admin', 'treasurer', 'president'].includes(role)) {
      router.push({ path: '/machinery-financial', query: { highlight: notification.reference_id, type: 'booking' } })
    } else {
      router.push({ path: '/machinery-booking', query: { highlight: notification.reference_id, type: 'booking' } })
    }
  } else if (notification.reference_type === 'income_assistance_distribution') {
    const role = authStore.currentUser?.role
    if (role === 'farmer') {
      router.push({ path: '/farmer-income', query: { tab: 'assistance' } })
    } else {
      router.push({ path: '/farmer-income-hub', query: { tab: role === 'agriculturist' ? 'distribution' : 'eligible' } })
    }
  }
}

const markAllAsRead = async () => {
  try {
    const headers = { ...getAuthHeaders(), 'Content-Type': 'application/json' }
    
    const response = await fetch('/api/notifications/read-all', { method: 'PUT', headers })
    if (!response.ok) {
      console.error(`Failed to mark all as read: ${response.status}`)
      return
    }
    notifications.value.forEach(n => n.is_read = 1)
    unreadCount.value = 0
  } catch (e) {
    console.error('Error marking all as read:', e)
  }
}

const toggleNotifications = () => {
  showNotifications.value = !showNotifications.value
  if (showNotifications.value) {
    loadNotifications() // Refresh notifications when opened
  }
}

const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  })
}

const handleClickOutside = (event) => {
  if (
    notificationsRef.value &&
    !notificationsRef.value.contains(event.target) &&
    !event.target.closest('.notification-btn')
  ) {
    showNotifications.value = false
  }
}

const goToSettings = () => {
  router.push('/settings')
}

const handleLogout = () => {
  showLogoutConfirm.value = true
}

const confirmLogout = () => {
  showLogoutConfirm.value = false
  authStore.logout()
  router.push('/login')
}

onMounted(() => {
  updateTime()
  const timeInterval = setInterval(updateTime, 1000)
  
  // Load notifications on mount
  loadNotifications()
  
  // Refresh notifications every 3 seconds
  const notifInterval = setInterval(loadNotifications, 3000)
  
  document.addEventListener('click', handleClickOutside)
  
  onUnmounted(() => {
    clearInterval(timeInterval)
    clearInterval(notifInterval)
    document.removeEventListener('click', handleClickOutside)
  })
})
</script>

<style scoped>
.top-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 70px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  /* Ensure header stays fixed and doesn't move */
  will-change: transform;
  backface-visibility: hidden;
  transform: translateZ(0);
  position: fixed !important;
}

.header-content {
  max-width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: relative;
  z-index: 1;
  gap: 16px;
  pointer-events: auto;
}

/* Mobile Header Responsive */
@media (max-width: 1024px) {
  .header-content {
    padding: 0 14px;
    gap: 10px;
  }
}

@media (max-width: 768px) {
  .header-content {
    padding: 0 10px;
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .header-content {
    padding: 0 8px;
    gap: 4px;
  }
}

.top-header .backdrop-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.2;
  mix-blend-mode: overlay;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

@media (max-width: 1024px) {
  .logo-section {
    gap: 12px;
  }
}

@media (max-width: 768px) {
  .logo-section {
    gap: 10px;
    flex-shrink: 1;
  }
}

@media (max-width: 480px) {
  .logo-section {
    gap: 8px;
    flex-shrink: 1;
    min-width: 0;
  }
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  font-size: 28px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #d1fae5, #a7f3d0);
  border-radius: 10px;
  flex-shrink: 0;
}

.logo-text-container {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.calffa-logo {
  font-size: 20px;
  font-weight: 800;
  color: #166534;
  letter-spacing: 0.5px;
  line-height: 1.2;
  font-family: 'Poppins', sans-serif;
}

.logo-text {
  font-size: 11px;
  color: #6b7280;
  font-weight: 500;
  line-height: 1.2;
}

@media (max-width: 768px) {
  .logo-container {
    gap: 10px;
  }

  .logo-icon {
    font-size: 24px;
    width: 36px;
    height: 36px;
  }

  .calffa-logo {
    font-size: 16px;
  }

  .logo-text {
    font-size: 9px;
  }
}

@media (max-width: 480px) {
  .logo-container {
    gap: 8px;
  }

  .logo-icon {
    font-size: 20px;
    width: 32px;
    height: 32px;
  }

  .calffa-logo {
    font-size: 14px;
  }

  .logo-text {
    font-size: 8px;
  }
}

/* System Info */
.system-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 0 24px;
  border-right: 1px solid #e5e7eb;
  flex-grow: 1;
}

@media (max-width: 1024px) {
  .system-info {
    display: none;
  }
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  background: #fee2e2;
  color: #dc2626;
}

.status-indicator.active {
  background: #d1fae5;
  color: #059669;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.timestamp {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.time-icon {
  font-size: 14px;
}

.refresh-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: #f3f4f6;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover {
  background: #e5e7eb;
  transform: rotate(90deg);
}

.refresh-btn.refreshing {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.refresh-icon {
  font-size: 16px;
}

/* Notifications */
.notification-container {
  position: relative;
}

.user-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-left: auto;
  flex-shrink: 0;
}

@media (max-width: 1024px) {
  .user-controls {
    gap: 12px;
  }
}

@media (max-width: 768px) {
  .user-controls {
    gap: 8px;
  }
}

@media (max-width: 480px) {
  .user-controls {
    gap: 4px;
  }
}

.role-dropdown {
  position: relative;
}

.role-select {
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s;
}

.role-select:hover {
  border-color: #9ca3af;
}

.role-select:focus {
  border-color: #166534;
  box-shadow: 0 0 0 3px rgba(22, 101, 52, 0.1);
}

.icon-btn {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
  flex-shrink: 0;
}

.icon-btn:hover {
  background: #f3f4f6;
}

.icon-btn .icon {
  font-size: 20px;
}

@media (max-width: 768px) {
  .icon-btn {
    width: 36px;
    height: 36px;
  }

  .icon-btn .icon {
    font-size: 18px;
  }
}

@media (max-width: 480px) {
  .icon-btn {
    width: 32px;
    height: 32px;
  }

  .icon-btn .icon {
    font-size: 16px;
  }
}

.logout-icon {
  transition: transform 0.2s ease;
}

.logout-btn:hover .logout-icon {
  transform: translateX(2px);
}

.notification-btn {
  position: relative;
}

.badge {
  position: absolute;
  top: 4px;
  right: 4px;
  background: #ef4444;
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
  line-height: 1.4;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  border-radius: 8px;
  transition: background-color 0.2s;
  cursor: pointer;
  flex-shrink: 0;
}

.user-profile:hover {
  background: #f3f4f6;
}

.profile-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #e5e7eb;
  flex-shrink: 0;
}

.profile-info {
  display: flex;
  flex-direction: column;
}

.profile-name {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  line-height: 1.2;
}

.profile-id {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.2;
}

@media (max-width: 768px) {
  .profile-avatar {
    width: 36px;
    height: 36px;
  }

  .profile-info {
    display: none;
  }
}

@media (max-width: 480px) {
  .profile-avatar {
    width: 32px;
    height: 32px;
  }
}

/* Responsive */
@media (max-width: 1024px) {
  .system-info {
    display: none;
  }
}

@media (max-width: 768px) {
  .logo-text {
    display: none;
  }

  .logo-container {
    gap: 8px;
  }

  .logo-icon {
    width: 32px;
    height: 32px;
    font-size: 20px;
  }

  .calffa-logo {
    font-size: 16px;
  }

  .profile-info {
    display: none;
  }
}
</style>

<style>
/* Notifications Modal - unscoped because it's teleported to body */
.notifications-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.notifications-modal {
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 420px;
  max-height: 80vh;
  overflow: hidden;
  animation: slideUp 0.3s ease;
  display: flex;
  flex-direction: column;
}

.notifications-modal .notifications-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
  flex-shrink: 0;
}

.notifications-modal .notifications-header h3 {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.notifications-modal .notifications-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.notifications-modal .mark-read-btn {
  padding: 4px 12px;
  background: transparent;
  border: none;
  color: #3b82f6;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.2s;
}

.notifications-modal .mark-read-btn:hover {
  background: #eff6ff;
}

.notifications-modal .modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #6b7280;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.notifications-modal .modal-close:hover {
  color: #1f2937;
}

.notifications-modal .notifications-list {
  overflow-y: auto;
  flex: 1;
}

.notifications-modal .notification-item {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.2s;
  cursor: pointer;
  position: relative;
}

.notifications-modal .notification-item:hover {
  background: #f9fafb;
}

.notifications-modal .notification-item.unread {
  background: #f0fdf4;
  font-weight: 500;
}

.notifications-modal .notification-item.unread:hover {
  background: #e7f9f0;
}

.notifications-modal .unread-indicator {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
  flex-shrink: 0;
}

.notifications-modal .notification-icon {
  font-size: 20px;
  flex-shrink: 0;
  min-width: 20px;
}

.notifications-modal .notification-content {
  flex: 1;
  min-width: 0;
}

.notifications-modal .notification-title {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 2px;
  line-height: 1.3;
}

.notifications-modal .notification-message {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.4;
  word-break: break-word;
}

.notifications-modal .notification-date {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 4px;
  font-weight: 500;
}

.notifications-modal .no-notifications {
  padding: 40px 20px;
  text-align: center;
  color: #6b7280;
  font-size: 14px;
}

.notifications-modal .empty-icon {
  display: block;
  font-size: 32px;
  margin-bottom: 8px;
}

@media (max-width: 480px) {
  .notifications-modal {
    width: 95%;
    max-width: none;
  }
}

/* Logout Confirmation Modal - unscoped because it's teleported to body */
.logout-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.logout-modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 400px;
  overflow: hidden;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.logout-modal .modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.logout-modal .modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.logout-modal .modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #6b7280;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.logout-modal .modal-close:hover {
  color: #1f2937;
}

.logout-modal .modal-body {
  padding: 20px;
}

.logout-modal .modal-body p {
  margin: 0;
  font-size: 15px;
  color: #4b5563;
  line-height: 1.6;
}

.logout-modal .modal-footer {
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  background: #f9fafb;
}

.logout-modal .btn-cancel,
.logout-modal .btn-logout {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-modal .btn-cancel {
  background: #e5e7eb;
  color: #1f2937;
}

.logout-modal .btn-cancel:hover {
  background: #d1d5db;
}

.logout-modal .btn-logout {
  background: #ef4444;
  color: white;
}

.logout-modal .btn-logout:hover {
  background: #dc2626;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

@media (max-width: 480px) {
  .logout-modal {
    width: 95%;
    max-width: none;
  }

  .logout-modal .modal-header {
    padding: 16px;
  }

  .logout-modal .modal-body {
    padding: 16px;
  }

  .logout-modal .modal-footer {
    padding: 12px 16px;
    flex-direction: column-reverse;
  }

  .logout-modal .btn-cancel,
  .logout-modal .btn-logout {
    width: 100%;
  }
}
</style>


