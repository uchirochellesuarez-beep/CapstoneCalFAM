<template>
  <div class="gcash-pay-panel" :class="{ 'light-theme': isLight }">
    <header class="gcash-pay-head">
      <h3 class="gcash-pay-title">{{ $t('ui.gcashPayVia') }}</h3>
      <p v-if="showIntroHint" class="gcash-pay-hint">{{ $t('ui.gcashFarmerHint') }}</p>
    </header>

    <div v-if="loading" class="gcash-pay-empty">{{ $t('common.loading') }}</div>

    <template v-else>
      <div v-if="pendingSubmission" class="gcash-status-box pending">
        <strong>{{ $t('ui.gcashPendingVerification') }}</strong>
        <p>{{ $t('ui.gcashPendingHint') }}</p>
        <button
          v-if="pendingSubmission.proof_path"
          type="button"
          class="gcash-proof-thumb"
          @click="$emit('preview-proof', proofUrl(pendingSubmission.proof_path))"
        >
          <img
            :src="proofUrl(pendingSubmission.proof_path)"
            :alt="$t('ui.proof')"
            class="gcash-proof-thumb-img"
          />
          <span>{{ $t('ui.gcashTapToEnlarge') }}</span>
        </button>
      </div>

      <div v-else-if="rejectedSubmission" class="gcash-status-box rejected">
        <strong>{{ $t('ui.gcashRejected') }}</strong>
        <p v-if="rejectedSubmission.rejection_reason">{{ rejectedSubmission.rejection_reason }}</p>
        <p>{{ $t('ui.gcashResubmitHint') }}</p>
      </div>

      <div v-else-if="verifiedSubmission" class="gcash-status-box verified">
        <strong>{{ $t('ui.gcashVerified') }}</strong>
        <p v-if="verifiedSubmission.receipt_number" class="gcash-receipt-line">
          {{ $t('ui.receiptNumber') }}: {{ verifiedSubmission.receipt_number }}
        </p>
        <button
          v-if="canSubmit && qr && !payAgainOpen"
          type="button"
          class="gcash-text-btn"
          @click="payAgainOpen = true"
        >
          {{ $t('ui.gcashPayAnother') }}
        </button>
      </div>

      <div v-if="canSubmit && !qr" class="gcash-pay-empty">{{ $t('ui.gcashNoQrYet') }}</div>

      <div v-else-if="showPayForm" class="gcash-pay-body">
        <div class="gcash-qr-col">
          <div class="gcash-qr-frame">
            <img :src="proofUrl(qr.image_path)" :alt="$t('ui.gcashQrCode')" class="gcash-qr-image" />
          </div>
        </div>
        <div class="gcash-upload-col">
          <p class="gcash-scan-note">{{ $t('ui.gcashScanThenUpload') }}</p>
          <input
            ref="fileInput"
            type="file"
            class="gcash-file-native"
            accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
            @change="onFile"
          />
          <button type="button" class="gcash-upload-zone" @click="fileInput?.click()">
            <span class="gcash-upload-label">
              {{ selectedFile ? $t('ui.gcashChangeImage') : $t('ui.gcashChooseImage') }}
            </span>
            <span class="gcash-upload-name">{{ fileName || $t('ui.gcashNoFileChosen') }}</span>
          </button>
          <button
            v-if="previewUrl"
            type="button"
            class="gcash-proof-thumb"
            @click="$emit('preview-proof', previewUrl)"
          >
            <img :src="previewUrl" :alt="$t('ui.gcashSelectedPreview')" class="gcash-proof-thumb-img" />
            <span>{{ $t('ui.gcashTapToEnlarge') }}</span>
          </button>
          <p v-if="fileError" class="gcash-file-error">{{ fileError }}</p>
          <div class="gcash-actions">
            <button
              type="button"
              class="btn-primary gcash-submit-btn"
              :disabled="submitting || !selectedFile"
              @click="submit"
            >
              {{ submitting ? $t('common.submitting') : $t('ui.gcashSubmitProof') }}
            </button>
            <button
              v-if="verifiedSubmission && payAgainOpen"
              type="button"
              class="gcash-text-btn gcash-cancel-again"
              @click="cancelPayAgain"
            >
              {{ $t('common.cancel') }}
            </button>
          </div>
        </div>
      </div>
    </template>

    <Teleport to="body">
      <div
        v-if="toastMessage"
        class="gcash-feedback-overlay"
        @click.self="clearToast"
      >
        <div
          class="gcash-feedback"
          :class="[toastType, { 'light-theme': isLight }]"
          role="alert"
        >
          <span>{{ toastMessage }}</span>
          <button
            type="button"
            class="gcash-feedback-close"
            :aria-label="$t('common.close')"
            @click="clearToast"
          >
            ×
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBackdropTheme } from '../composables/useBackdropTheme'
import { useGcashPaymentStore } from '../stores/gcashPaymentStore'
import { apiUrl } from '../utils/apiBase'

const props = defineProps({
  transactionType: { type: String, required: true },
  referenceId: { type: [Number, String], required: true },
  enabled: { type: Boolean, default: true }
})

const emit = defineEmits(['submitted', 'preview-proof', 'error'])

const { t } = useI18n()
const { isDark } = useBackdropTheme()
const isLight = computed(() => !isDark.value)
const store = useGcashPaymentStore()

const loading = ref(false)
const submitting = ref(false)
const qr = ref(null)
const submissions = ref([])
const selectedFile = ref(null)
const fileName = ref('')
const fileError = ref('')
const fileInput = ref(null)
const payAgainOpen = ref(false)
const previewUrl = ref('')
const toastMessage = ref('')
const toastType = ref('success')
let toastTimer = null

const latest = computed(() => submissions.value[0] || null)
const pendingSubmission = computed(() =>
  submissions.value.find((s) => s.status === 'pending_verification') || null
)
const rejectedSubmission = computed(() => {
  if (pendingSubmission.value) return null
  return latest.value?.status === 'rejected' ? latest.value : null
})
const verifiedSubmission = computed(() => {
  if (pendingSubmission.value || rejectedSubmission.value) return null
  return submissions.value.find((s) => s.status === 'verified') || null
})
const canSubmit = computed(() => props.enabled && !pendingSubmission.value)
const showIntroHint = computed(
  () => !pendingSubmission.value && !verifiedSubmission.value && !rejectedSubmission.value
)
const showPayForm = computed(() => {
  if (!canSubmit.value || !qr.value) return false
  if (verifiedSubmission.value) return payAgainOpen.value
  return true
})

const proofUrl = (path) => apiUrl(path)

const IMAGE_RE = /\.(jpe?g|png|gif|webp|jfif)$/i

function clearToast() {
  toastMessage.value = ''
  if (toastTimer) {
    clearTimeout(toastTimer)
    toastTimer = null
  }
}

function showToast(message, type = 'success') {
  if (!message) return
  toastType.value = type
  toastMessage.value = message
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(clearToast, type === 'error' ? 6000 : 4500)
}

function revokePreview() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }
}

function clearFile() {
  selectedFile.value = null
  fileName.value = ''
  fileError.value = ''
  revokePreview()
  if (fileInput.value) fileInput.value.value = ''
}

function cancelPayAgain() {
  payAgainOpen.value = false
  clearFile()
}

function onFile(event) {
  const file = event.target.files?.[0]
  fileError.value = ''
  selectedFile.value = null
  fileName.value = ''
  if (!file) return
  const okType = (file.type || '').startsWith('image/') || IMAGE_RE.test(file.name)
  if (!okType) {
    fileError.value = t('ui.gcashImageOnly')
    event.target.value = ''
    return
  }
  selectedFile.value = file
  fileName.value = file.name
  revokePreview()
  previewUrl.value = URL.createObjectURL(file)
}

async function load() {
  if (!props.referenceId) return
  loading.value = true
  try {
    qr.value = await store.fetchQr()
    submissions.value = await store.fetchMine(props.transactionType, props.referenceId)
    payAgainOpen.value = false
    clearFile()
  } catch (error) {
    showToast(error.message, 'error')
    emit('error', error.message)
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!selectedFile.value || submitting.value) return
  submitting.value = true
  try {
    await store.submitProof({
      transactionType: props.transactionType,
      referenceId: props.referenceId,
      file: selectedFile.value
    })
    clearFile()
    submissions.value = await store.fetchMine(props.transactionType, props.referenceId)
    payAgainOpen.value = false
    showToast(t('ui.gcashProofSubmitted'), 'success')
    emit('submitted')
  } catch (error) {
    showToast(error.message, 'error')
    emit('error', error.message)
  } finally {
    submitting.value = false
  }
}

watch(
  () => [props.transactionType, props.referenceId],
  () => {
    load()
  }
)

onMounted(() => {
  load()
})

onUnmounted(() => {
  revokePreview()
  clearToast()
})
</script>

<style scoped>
.gcash-pay-panel {
  position: relative;
  margin-top: 16px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--tx-detail-border-soft, rgba(190, 235, 203, 0.22));
  background: var(--tx-detail-surface-soft, rgba(18, 32, 24, 0.45));
  color: var(--tx-detail-primary, inherit);
}

.gcash-pay-head {
  margin-bottom: 4px;
}

.gcash-pay-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.3;
  color: var(--tx-detail-primary, inherit);
}

.gcash-pay-hint,
.gcash-scan-note,
.gcash-pay-empty {
  margin: 8px 0 0;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--tx-detail-secondary, inherit);
}

.gcash-pay-body {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin-top: 14px;
  align-items: start;
}

.gcash-qr-frame {
  display: flex;
  justify-content: center;
  padding: 12px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid var(--tx-detail-border-soft, rgba(0, 0, 0, 0.08));
}

.gcash-qr-image {
  width: min(200px, 70vw);
  height: auto;
  display: block;
}

.gcash-upload-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.gcash-scan-note {
  margin: 0;
  text-align: left;
}

.gcash-file-native {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  overflow: hidden;
}

.gcash-upload-zone {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  width: 100%;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px dashed var(--tx-detail-border, #cfe6d6);
  background: var(--tx-detail-surface, #fff);
  color: var(--tx-detail-primary, inherit);
  cursor: pointer;
  text-align: left;
  font: inherit;
}

.gcash-upload-zone:hover {
  border-color: var(--tx-detail-accent, #166534);
}

.gcash-upload-label {
  font-size: 0.88rem;
  font-weight: 700;
}

.gcash-upload-name {
  font-size: 0.82rem;
  color: var(--tx-detail-label, #6b7280);
  word-break: break-all;
}

.gcash-proof-thumb {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  width: 100%;
  margin-top: 8px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: var(--tx-detail-label, #6b7280);
}

.gcash-proof-thumb-img {
  width: 100%;
  max-height: 280px;
  object-fit: contain;
  border-radius: 10px;
  background: #fff;
  border: 1px solid var(--tx-detail-border-soft, rgba(0, 0, 0, 0.08));
}

.gcash-proof-thumb span {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--tx-detail-accent, #166534);
}

.gcash-file-error {
  color: var(--tx-detail-rejection-text, #c2410c);
  font-size: 0.85rem;
  margin: 0;
}

.gcash-actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}

.gcash-submit-btn {
  width: 100%;
}

.gcash-text-btn {
  display: inline-flex;
  align-items: center;
  margin-top: 8px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--tx-detail-accent, #166534);
  font: inherit;
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.gcash-cancel-again {
  margin-top: 0;
  align-self: center;
}

.gcash-status-box {
  padding: 12px 14px;
  border-radius: 10px;
  margin-top: 12px;
  border: 1px solid transparent;
}

.gcash-status-box p {
  margin: 6px 0 0;
  font-size: 0.9rem;
  line-height: 1.45;
}

.gcash-receipt-line {
  font-weight: 600;
}

.gcash-status-box.pending {
  background: var(--tx-detail-penalty-bg, rgba(234, 179, 8, 0.16));
  border-color: var(--tx-detail-penalty-border, transparent);
  color: var(--tx-detail-penalty-text, inherit);
}

.gcash-status-box.verified {
  background: rgba(34, 197, 94, 0.14);
  border-color: rgba(34, 197, 94, 0.28);
}

.gcash-status-box.rejected {
  background: var(--tx-detail-rejection-bg, rgba(239, 68, 68, 0.14));
  border-color: var(--tx-detail-rejection-border, transparent);
  color: var(--tx-detail-rejection-text, inherit);
}

@media (min-width: 600px) {
  .gcash-pay-panel {
    padding: 18px 20px;
  }

  .gcash-pay-body {
    grid-template-columns: minmax(180px, 220px) minmax(0, 1fr);
    gap: 20px;
    align-items: center;
  }

  .gcash-qr-image {
    width: 100%;
    max-width: 200px;
  }

  .gcash-submit-btn {
    width: auto;
    min-width: 240px;
  }

  .gcash-actions {
    flex-direction: row;
    align-items: center;
  }

  .gcash-cancel-again {
    align-self: center;
  }
}

@media (max-width: 479px) {
  .gcash-pay-panel {
    padding: 14px;
  }

  .gcash-qr-image {
    width: min(188px, 72vw);
  }

  .gcash-pay-title {
    font-size: 0.98rem;
  }
}
</style>

<style>
.gcash-feedback-overlay {
  position: fixed;
  inset: 0;
  z-index: 14000 !important;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(6, 12, 9, 0.55);
}

.gcash-feedback {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  width: min(440px, calc(100vw - 2rem));
  padding: 16px 18px;
  border-radius: 14px;
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.38);
  animation: gcash-feedback-pop 0.18s ease-out;
}

.gcash-feedback.success {
  background: rgba(6, 95, 70, 0.96);
  color: #d1fae5;
  border-left: 4px solid #10b981;
}

.gcash-feedback.error {
  background: rgba(127, 29, 29, 0.96);
  color: #fecaca;
  border-left: 4px solid #ef4444;
}

.gcash-feedback.light-theme.success {
  background: #f0fdf4;
  color: #15803d;
  border-left-color: #16a34a;
}

.gcash-feedback.light-theme.error {
  background: #fee2e2;
  color: #991b1b;
  border-left-color: #dc2626;
}

.gcash-feedback span {
  flex: 1;
  min-width: 0;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.45;
}

.gcash-feedback-close {
  flex-shrink: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  opacity: 0.8;
}

@keyframes gcash-feedback-pop {
  from {
    opacity: 0;
    transform: scale(0.94);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
