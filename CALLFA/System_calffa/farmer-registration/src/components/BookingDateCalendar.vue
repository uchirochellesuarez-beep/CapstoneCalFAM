<template>
  <div class="booking-date-calendar">
    <ContentSkeleton v-if="loading" variant="table" :rows="2" label="Checking availability" />
    <div class="cal-nav">
      <button type="button" class="cal-nav-btn" :disabled="!canShiftPrev" @click="$emit('shift', -1)" aria-label="Previous month">‹</button>
      <span class="cal-nav-title">{{ monthTitle }}</span>
      <button type="button" class="cal-nav-btn" :disabled="!canShiftNext" @click="$emit('shift', 1)" aria-label="Next month">›</button>
    </div>
    <div class="cal-weekdays">
      <span v-for="w in weekdays" :key="w">{{ w }}</span>
    </div>
    <div class="cal-grid">
      <button
        v-for="c in cells"
        :key="c.key"
        type="button"
        class="cal-cell"
        :class="{
          'cal-cell--outside': !c.inMonth,
          'cal-cell--disabled': c.disabled,
          'cal-cell--full': c.isFull,
          'cal-cell--selected': c.selected
        }"
        :disabled="c.disabled"
        @click="$emit('select', c)"
      >
        <span class="cal-day-num">{{ c.dayNum }}</span>
        <span v-if="c.isFull" class="cal-full-label">{{ fullLabel }}</span>
      </button>
    </div>
    <p v-if="selectedLabel" class="cal-selected-hint">
      Selected: <strong>{{ selectedLabel }}</strong>
    </p>
    <p v-else class="cal-selected-hint cal-selected-hint--muted">{{ pickHint }}</p>
    <p
      v-if="availabilityText"
      class="cal-availability-hint"
      :class="{ 'cal-availability-hint--low': availabilityLow }"
    >
      <strong>Available:</strong> {{ availabilityText }}
      <span v-if="availabilityMeta" class="cal-availability-meta">{{ availabilityMeta }}</span>
    </p>
  </div>
</template>

<script>
export default {
  name: 'BookingDateCalendar',
  props: {
    loading: { type: Boolean, default: false },
    monthTitle: { type: String, default: '' },
    weekdays: { type: Array, default: () => [] },
    cells: { type: Array, default: () => [] },
    canShiftPrev: { type: Boolean, default: false },
    canShiftNext: { type: Boolean, default: false },
    selectedLabel: { type: String, default: '' },
    pickHint: { type: String, default: 'Pick a date on the calendar.' },
    fullLabel: { type: String, default: 'FULL' },
    availabilityText: { type: String, default: '' },
    availabilityMeta: { type: String, default: '' },
    availabilityLow: { type: Boolean, default: false }
  },
  emits: ['shift', 'select']
}
</script>

<style scoped>
.booking-date-calendar {
  margin-top: 0;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(10, 20, 14, 0.45);
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.cal-loading {
  margin: 0 0 8px;
  font-size: 13px;
  color: #a8d8b8;
}

.cal-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.cal-nav-title {
  flex: 1;
  text-align: center;
  font-weight: 800;
  font-size: 15px;
  color: #ecfdf5;
}

.cal-nav-btn {
  width: 36px !important;
  min-width: 36px !important;
  height: 36px;
  min-height: 36px !important;
  padding: 0 !important;
  border-radius: 10px !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  background: rgba(34, 197, 94, 0.15);
  color: #bbf7d0;
  font-size: 20px !important;
  line-height: 1;
  cursor: pointer;
}

.cal-nav-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.cal-weekdays,
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  width: 100%;
  min-width: 0;
  gap: 4px;
}

.cal-weekdays {
  margin-bottom: 6px;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  color: #86b89a;
  text-transform: uppercase;
}

.cal-weekdays span,
.cal-cell {
  min-width: 0 !important;
}

.cal-cell {
  position: relative;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  min-height: 42px;
  padding: 4px 0 6px !important;
  border-radius: 10px !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  background: rgba(255, 255, 255, 0.04);
  color: #ecfdf5;
  cursor: pointer;
  display: flex !important;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}

.cal-cell:disabled {
  cursor: not-allowed;
}

.cal-day-num {
  font-weight: 800;
  font-size: 13px;
  line-height: 1.1;
}

.cal-full-label {
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.04em;
  color: #fff;
  line-height: 1;
}

.cal-cell--outside {
  opacity: 0.25;
}

.cal-cell--disabled {
  opacity: 0.45;
}

.cal-cell--full {
  background: rgba(153, 27, 27, 0.55) !important;
  border-color: rgba(254, 202, 202, 0.55) !important;
  color: #fee2e2 !important;
}

.cal-cell--selected:not(.cal-cell--disabled) {
  outline: 2px solid rgba(74, 222, 128, 0.85);
  outline-offset: 1px;
  background: rgba(74, 222, 128, 0.2);
}

.cal-selected-hint {
  margin: 10px 0 0;
  font-size: 13px;
  color: #b6e4c5;
}

.cal-selected-hint--muted {
  color: #89b099;
  font-style: italic;
}

.cal-availability-hint {
  margin: 8px 0 0;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(22, 163, 74, 0.16);
  border: 1px solid rgba(74, 222, 128, 0.35);
  color: #dcfce7;
  font-size: 13px;
  line-height: 1.4;
}

.cal-availability-hint--low {
  background: rgba(220, 38, 38, 0.16);
  border-color: rgba(248, 113, 113, 0.4);
  color: #fecaca;
}

.cal-availability-meta {
  display: block;
  margin-top: 4px;
  opacity: 0.85;
  font-size: 12px;
}
</style>
