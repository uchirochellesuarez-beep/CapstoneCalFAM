import { ref } from 'vue'
import { useAuthStore } from '../stores/authStore'

export function todayISODate() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function usePaymentReceipt() {
  const showReceiptModal = ref(false)
  const lastReceipt = ref(null)
  const receiptAutoPrint = ref(true)

  const enrichReceipt = (receipt) => {
    if (!receipt) return receipt
    const authStore = useAuthStore()
    return {
      ...receipt,
      barangay_name:
        receipt.barangay_name ||
        authStore.currentUser?.barangay_name ||
        authStore.currentUser?.barangay ||
        '',
      collector_name:
        receipt.collector_name ||
        authStore.currentUser?.full_name ||
        'Treasurer',
      payment_for: receipt.payment_for || receipt.remarks || ''
    }
  }

  const getAuthHeaders = () => {
    const authStore = useAuthStore()
    const token = authStore.token || localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const fetchReceipt = async (receiptNumber) => {
    const response = await fetch(`/api/receipts/${encodeURIComponent(receiptNumber)}`, {
      headers: getAuthHeaders()
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Receipt not found')
    return enrichReceipt(data.receipt)
  }

  const showAndPrintReceipt = async (receiptNumber) => {
    if (!receiptNumber) return
    lastReceipt.value = await fetchReceipt(receiptNumber)
    receiptAutoPrint.value = true
    showReceiptModal.value = true
  }

  const closeReceiptModal = () => {
    showReceiptModal.value = false
    receiptAutoPrint.value = false
  }

  return {
    showReceiptModal,
    lastReceipt,
    receiptAutoPrint,
    fetchReceipt,
    showAndPrintReceipt,
    closeReceiptModal,
    todayISODate
  }
}
