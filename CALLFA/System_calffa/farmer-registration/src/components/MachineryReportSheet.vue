<template>
  <div :class="['collectibles-form-sheet', sheetClass]">
    <div class="collectibles-form-title-block">
      <h2 class="collectibles-main-title">{{ title }}</h2>
      <p v-if="subtitle" class="collectibles-main-subtitle">{{ subtitle }}</p>
    </div>

    <div class="collectibles-meta-box collectibles-meta-box-compact">
      <div class="collectibles-meta-split">
        <div class="collectibles-meta-col collectibles-meta-col-left">
          <div class="collectibles-meta-field-block">
            <span class="collectibles-meta-label-sm">{{ $t('ui.nameOfCfa') }}</span>
            <span class="collectibles-meta-fill">{{ barangayName }}</span>
          </div>
          <div v-if="showMachineryType" class="collectibles-meta-field-block">
            <span class="collectibles-meta-label-sm">Uri ng makinarya / Type of Farm Machinery:</span>
            <span class="collectibles-meta-fill">{{ machineryLabel }}</span>
          </div>
          <div class="collectibles-meta-field-block">
            <span class="collectibles-meta-label-sm">Buwan saklaw ng talaan / Period covered:</span>
            <span class="collectibles-meta-fill">{{ periodLabel }}</span>
          </div>
        </div>
        <div class="collectibles-meta-col collectibles-meta-col-right">
          <div class="collectibles-meta-field-block">
            <span class="collectibles-meta-label-sm">{{ $t('ui.contactPerson') }}</span>
            <div class="sheet-fill-line">
              <input
                v-model="sheetMeta.contactPerson"
                type="text"
                data-sheet-field="contactPerson"
                class="sheet-fill-input"
                spellcheck="false"
              />
            </div>
          </div>
          <div class="collectibles-meta-field-block">
            <span class="collectibles-meta-label-sm">Cropping Period / Panahon ng Pagtatanim:</span>
            <div class="sheet-fill-line">
              <input
                v-model="sheetMeta.croppingPeriod"
                type="text"
                data-sheet-field="croppingPeriod"
                class="sheet-fill-input"
                spellcheck="false"
              />
            </div>
          </div>
          <div class="collectibles-meta-field-block">
            <span class="collectibles-meta-label-sm">Address / Tirahan ng FCA:</span>
            <div class="sheet-fill-line">
              <input
                v-model="sheetMeta.fcaAddress"
                type="text"
                data-sheet-field="fcaAddress"
                class="sheet-fill-input"
                spellcheck="false"
              />
            </div>
          </div>
          <div class="collectibles-meta-field-block">
            <span class="collectibles-meta-label-sm">Contact Number / Numero ng Telepono:</span>
            <div class="sheet-fill-line">
              <input
                v-model="sheetMeta.contactNumber"
                type="text"
                data-sheet-field="contactNumber"
                class="sheet-fill-input"
                spellcheck="false"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="collectibles-table-wrap fcr-responsive-wrap">
      <div class="fcr-desktop-table">
        <slot />
      </div>
      <slot name="mobile" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  barangayName: { type: String, default: '—' },
  machineryLabel: { type: String, default: '—' },
  periodLabel: { type: String, default: '—' },
  sheetMeta: { type: Object, required: true },
  sheetClass: { type: String, default: 'collectibles-list-sheet' },
  showMachineryType: { type: Boolean, default: true }
});
</script>

<style scoped>
.collectibles-form-sheet {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.collectibles-meta-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 24px;
  align-items: start;
}

.collectibles-meta-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.collectibles-meta-col-left {
  padding-right: 12px;
  border-right: 1px solid #cbd5e1;
}

.collectibles-meta-col-right {
  padding-left: 4px;
}

.collectibles-table-wrap,
.fcr-responsive-wrap {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.fcr-desktop-table {
  display: block;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

:deep(.fcr-mobile-list) {
  display: none;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

@media (max-width: 1100px) {
  .fcr-desktop-table {
    display: none !important;
  }

  :deep(.fcr-mobile-list) {
    display: block !important;
  }

  .collectibles-table-wrap,
  .fcr-responsive-wrap {
    overflow: visible;
  }

  .collectibles-meta-split {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .collectibles-meta-col {
    gap: 4px;
  }

  .collectibles-meta-col-left {
    padding-right: 0;
    border-right: none;
    padding-bottom: 6px;
    border-bottom: 1px solid #cbd5e1;
  }

  .collectibles-meta-col-right {
    padding-left: 0;
  }
}

@media screen and (max-width: 768px) {
  .collectibles-form-title-block {
    margin-bottom: 4px;
  }

  .collectibles-meta-split {
    gap: 3px !important;
  }

  .collectibles-meta-col {
    gap: 2px !important;
  }

  .collectibles-meta-col-left {
    padding-bottom: 4px !important;
  }

  .collectibles-meta-field-block {
    gap: 0 !important;
  }
}

@media print {
  .fcr-desktop-table {
    display: block !important;
  }

  :deep(.fcr-mobile-list) {
    display: none !important;
  }
}
</style>
