<template>
  <div class="page-container farmer-income-page machinery-ui" :class="{ 'light-theme': isLight }">
    <div class="page-header page-header-split">
      <div class="page-header-text">
        <h1 class="page-title">{{ $t('ui.farmIncomeTitle') }}</h1>
        <p class="page-subtitle">{{ $t('incomeForm.subtitle') }}</p>
      </div>
    </div>

    <!-- Success/Error Messages (teleported, centered — clears fixed header) -->
    <Teleport to="body">
      <div v-if="successMessage || errorMessage" class="alert-center-stack farmer-income-alerts" :class="{ 'light-theme': isLight }">
        <div v-if="successMessage" class="alert alert-success">
          <span>{{ successMessage }}</span>
          <button type="button" class="alert-close" @click="successMessage = ''">&times;</button>
        </div>
        <div v-if="errorMessage" class="alert alert-error">
          <span>{{ errorMessage }}</span>
          <button type="button" class="alert-close" @click="errorMessage = ''">&times;</button>
        </div>
      </div>
    </Teleport>

    <!-- Tab Navigation -->
    <div class="tab-nav">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'form' }"
        @click="activeTab = 'form'; if (editingRecordId) cancelEdit()"
      >
        {{ editingRecordId ? $t('incomeForm.editRecord') : $t('incomeForm.newRecord') }}
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'history' }"
        @click="activeTab = 'history'; fetchRecords()"
      >
        {{ $t('incomeForm.previousRecords') }}
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'assistance' }"
        @click="activeTab = 'assistance'; fetchCompletedAssistance()"
      >
        {{ $t('incomeForm.assistanceReceived') }}
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'predictive' }"
        @click="activeTab = 'predictive'; loadPredictiveData()"
      >
        {{ $t('common.predictiveAnalytics') }}
      </button>
    </div>

    <!-- FORM TAB -->
    <div v-if="activeTab === 'form'" class="form-wrapper">
      <!-- Edit mode banner -->
      <div v-if="editingRecordId" class="edit-banner">
        <span>{{ $t('incomeForm.editingFrom', { date: formatDate(editingCreatedAt) }) }}</span>
        <button class="cancel-edit-btn" @click="cancelEdit">{{ $t('common.cancel') }}</button>
      </div>
      <form @submit.prevent="submitForm" class="income-form">

        <!-- Section 1: Farm Details -->
        <div class="form-section">
          <h2 class="section-title">{{ $t('incomeForm.farmDetails') }}</h2>
          <div class="form-row">
            <div class="form-group">
              <label>{{ $t('incomeForm.areaHectares') }}</label>
              <input
                type="number"
                v-model.number="form.area_hectares"
                :placeholder="$t('incomeForm.example15')"
                step="any"
                min="0.01"
                required
                @wheel.prevent
                @keydown.up.prevent
                @keydown.down.prevent
              />
            </div>
            <div class="form-group">
              <label>{{ $t('incomeForm.plantingMethod') }}</label>
              <select v-model="form.planting_method" required>
                <option value="">{{ $t('ui.choose') }}</option>
                <option value="sabog">{{ $t('incomeForm.sabog') }}</option>
                <option value="talok">{{ $t('incomeForm.talok') }}</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group full-width">
              <label>{{ $t('ui.irrigation') }}</label>
              <select v-model="form.irrigation_type" required>
                <option value="">{{ $t('ui.choose') }}</option>
                <option value="NIA">{{ $t('incomeForm.nia') }}</option>
                <option value="bugsok_waterpump">{{ $t('incomeForm.bugsokPump') }}</option>
                <option value="waterpump_irrigation">{{ $t('incomeForm.pumpIrrigation') }}</option>
                <option value="waterpump_ilog">{{ $t('incomeForm.pumpRiver') }}</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Section 2: Abono (Fertilizers) -->
        <div class="form-section">
          <h2 class="section-title">{{ $t('incomeForm.fertilizersUsed') }}</h2>
          <div class="dynamic-table-wrapper">
            <table class="dynamic-table">
              <thead>
                <tr>
                  <th>{{ $t('incomeForm.fertilizerClass') }}</th>
                  <th>{{ $t('incomeForm.howManySacks') }}</th>
                  <th>{{ $t('incomeForm.pricePerSack') }}</th>
                  <th>{{ $t('incomeForm.totalPeso') }}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, index) in form.fertilizers"
                  :key="'fert-' + index"
                  :class="{ 'has-remove': form.fertilizers.length > 1 }"
                >
                  <td>
                    <span class="dt-label">{{ $t('incomeForm.fertilizerClass') }}</span>
                    <select v-model="item.type" required>
                      <option value="">{{ $t('ui.choose') }}</option>
                      <option value="14-14-14">14-14-14</option>
                      <option value="46-0-0">46-0-0</option>
                      <option value="0-0-60">0-0-60</option>
                      <option value="17-0-17">17-0-17</option>
                      <option value="25-0-0">25-0-0</option>
                      <option value="16-20-0">16-20-0</option>
                      <option value="21-0-0">21-0-0</option>
                    </select>
                  </td>
                  <td>
                    <span class="dt-label">{{ $t('incomeForm.howManySacks') }}</span>
                    <input
                      type="number"
                      v-model.number="item.sacks"
                      placeholder="0"
                      min="0"
                      step="any"
                      @wheel.prevent
                      @keydown.up.prevent
                      @keydown.down.prevent
                    />
                  </td>
                  <td>
                    <span class="dt-label">{{ $t('incomeForm.pricePerSackShort') }}</span>
                    <input
                      type="number"
                      v-model.number="item.price_per_sack"
                      placeholder="0.00"
                      min="0"
                      step="any"
                      @wheel.prevent
                      @keydown.up.prevent
                      @keydown.down.prevent
                    />
                  </td>
                  <td class="computed-cell">
                    <span class="dt-label">{{ $t('ui.total') }}</span>
                    <span class="dt-value">₱{{ fertilizerLineTotal(item).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                  </td>
                  <td class="dt-actions-cell">
                    <button
                      type="button"
                      class="remove-btn"
                      @click="removeFertilizer(index)"
                      v-if="form.fertilizers.length > 1"
                      :title="$t('ui.remove')"
                    >&times;</button>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" class="total-label">{{ $t('incomeForm.totalFertilizerCost') }}</td>
                  <td class="total-value">
                    ₱{{ totalFertilizerCost.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <button type="button" class="add-row-btn" @click="addFertilizer">
            {{ $t('incomeForm.addFertilizer') }}
          </button>
        </div>

        <!-- Section 3: Pesticides -->
        <div class="form-section">
          <h2 class="section-title">{{ $t('incomeForm.pesticidesUsed') }}</h2>
          <div class="dynamic-table-wrapper">
            <table class="dynamic-table">
              <thead>
                <tr>
                  <th>{{ $t('incomeForm.pesticideClass') }}</th>
                  <th>{{ $t('incomeForm.bottlesPacks') }}</th>
                  <th>{{ $t('incomeForm.pricePerBottle') }}</th>
                  <th>{{ $t('incomeForm.totalPeso') }}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, index) in form.pesticides"
                  :key="'pest-' + index"
                  :class="{ 'has-remove': form.pesticides.length > 1 }"
                >
                  <td>
                    <span class="dt-label">{{ $t('incomeForm.pesticideClass') }}</span>
                    <input
                      type="text"
                      v-model="item.type"
                      :placeholder="$t('incomeForm.pesticideNamePh')"
                      required
                    />
                  </td>
                  <td>
                    <span class="dt-label">{{ $t('incomeForm.bottlesPacks') }}</span>
                    <input
                      type="number"
                      v-model.number="item.quantity"
                      placeholder="0"
                      min="0"
                      step="any"
                      @wheel.prevent
                      @keydown.up.prevent
                      @keydown.down.prevent
                    />
                  </td>
                  <td>
                    <span class="dt-label">{{ $t('incomeForm.pricePerUnit') }}</span>
                    <input
                      type="number"
                      v-model.number="item.price_per_unit"
                      placeholder="0.00"
                      min="0"
                      step="any"
                      @wheel.prevent
                      @keydown.up.prevent
                      @keydown.down.prevent
                    />
                  </td>
                  <td class="computed-cell">
                    <span class="dt-label">{{ $t('ui.total') }}</span>
                    <span class="dt-value">₱{{ pesticideLineTotal(item).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                  </td>
                  <td class="dt-actions-cell">
                    <button
                      type="button"
                      class="remove-btn"
                      @click="removePesticide(index)"
                      v-if="form.pesticides.length > 1"
                      :title="$t('ui.remove')"
                    >&times;</button>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" class="total-label">{{ $t('incomeForm.totalPesticideCost') }}</td>
                  <td class="total-value">
                    ₱{{ totalPesticideCost.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <button type="button" class="add-row-btn" @click="addPesticide">
            {{ $t('incomeForm.addPesticide') }}
          </button>
        </div>

        <!-- Section 4: Labor & Other Expenses -->
        <div class="form-section">
          <h2 class="section-title">{{ $t('incomeForm.laborOther') }}</h2>
          <div class="form-row">
            <div class="form-group">
              <label>{{ $t('incomeForm.landPrepCost') }}</label>
              <input type="number" v-model.number="form.land_preparation_cost" placeholder="0.00" min="0" step="any" @wheel.prevent @keydown.up.prevent @keydown.down.prevent />
            </div>
            <div class="form-group">
              <label>{{ $t('incomeForm.plantingCost') }}</label>
              <input type="number" v-model.number="form.planting_cost" placeholder="0.00" min="0" step="any" @wheel.prevent @keydown.up.prevent @keydown.down.prevent />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>{{ $t('incomeForm.sprayingCost') }}</label>
              <input type="number" v-model.number="form.spraying_cost" placeholder="0.00" min="0" step="any" @wheel.prevent @keydown.up.prevent @keydown.down.prevent />
            </div>
            <div class="form-group">
              <label>{{ $t('incomeForm.harvesterCost') }}</label>
              <input type="number" v-model.number="form.harvester_cost" placeholder="0.00" min="0" step="any" @wheel.prevent @keydown.up.prevent @keydown.down.prevent />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>{{ $t('incomeForm.dryingCost') }}</label>
              <input type="number" v-model.number="form.drying_cost" placeholder="0.00" min="0" step="any" @wheel.prevent @keydown.up.prevent @keydown.down.prevent />
            </div>
            <div class="form-group">
              <label>{{ $t('incomeForm.haulingCost') }}</label>
              <input type="number" v-model.number="form.hauling_cost" placeholder="0.00" min="0" step="any" @wheel.prevent @keydown.up.prevent @keydown.down.prevent />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>{{ $t('incomeForm.taraskoCost') }}</label>
              <input type="number" v-model.number="form.tarasko_cost" placeholder="0.00" min="0" step="any" @wheel.prevent @keydown.up.prevent @keydown.down.prevent />
            </div>
            <div class="form-group">
              <label>{{ $t('incomeForm.fuelCost') }}</label>
              <input type="number" v-model.number="form.fuel_cost" placeholder="0.00" min="0" step="any" @wheel.prevent @keydown.up.prevent @keydown.down.prevent />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group full-width">
              <label>{{ $t('incomeForm.otherExpenses') }}</label>
              <input type="number" v-model.number="form.other_expenses" placeholder="0.00" min="0" step="any" @wheel.prevent @keydown.up.prevent @keydown.down.prevent />
            </div>
          </div>
          <div class="labor-total-box">
            <span class="labor-total-label">{{ $t('incomeForm.totalLabor') }}</span>
            <span class="labor-total-value">₱{{ totalLaborCost.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
          </div>
        </div>

        <!-- Section 5: Harvest -->
        <div class="form-section">
          <h2 class="section-title">{{ $t('ui.harvest') }}</h2>
          <div class="form-row">
            <div class="form-group">
              <label>{{ $t('incomeForm.sacksHarvested') }}</label>
              <input type="number" v-model.number="form.sacks_harvested" placeholder="0" min="0" step="any" required @wheel.prevent @keydown.up.prevent @keydown.down.prevent />
            </div>
            <div class="form-group">
              <label>{{ $t('incomeForm.kgPerSack') }}</label>
              <input type="number" v-model.number="form.kg_per_sack" placeholder="0" min="0" step="any" required @wheel.prevent @keydown.up.prevent @keydown.down.prevent />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>{{ $t('incomeForm.pricePerKg') }}</label>
              <input type="number" v-model.number="form.price_per_kg" placeholder="0.00" min="0" step="any" required @wheel.prevent @keydown.up.prevent @keydown.down.prevent />
            </div>
          </div>
        </div>

        <!-- Summary Section -->
        <div class="form-section summary-section">
          <h2 class="section-title">{{ $t('incomeForm.summary') }}</h2>
          <div class="summary-grid">
            <div class="summary-item">
              <span class="summary-label">{{ $t('incomeForm.totalHarvestKg') }}</span>
              <span class="summary-value">{{ totalHarvestKg.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }} kg</span>
            </div>
            <div class="summary-item income">
              <span class="summary-label">{{ $t('incomeForm.totalSales') }}</span>
              <span class="summary-value">₱{{ grossIncome.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
            </div>
            <div class="summary-item expense">
              <span class="summary-label">{{ $t('ui.totalExpenses') }}</span>
              <span class="summary-value">₱{{ totalExpenses.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
            </div>
            <div class="summary-item" :class="netIncome >= 0 ? 'profit' : 'loss'">
              <span class="summary-label">{{ $t('incomeForm.netIncome') }}</span>
              <span class="summary-value">₱{{ netIncome.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
            </div>
          </div>
        </div>

        <!-- Submit -->
        <div class="form-actions">
          <button type="button" class="btn-reset" @click="editingRecordId ? cancelEdit() : resetForm()">{{ editingRecordId ? $t('incomeForm.cancel') : $t('incomeForm.reset') }}</button>
          <button type="submit" class="btn-submit" :disabled="submitting">
            <span v-if="submitting">{{ editingRecordId ? $t('incomeForm.updating') : $t('incomeForm.submitting') }}</span>
            <span v-else>{{ editingRecordId ? $t('incomeForm.updateRecord') : $t('incomeForm.saveRecord') }}</span>
          </button>
        </div>
      </form>
    </div>

    <!-- HISTORY TAB -->
    <div v-if="activeTab === 'history'" class="history-wrapper">
      <div v-if="loadingRecords" class="loading-state">
        <div class="spinner"></div>
        <p>{{ $t('ui.loadingRecords') }}</p>
      </div>
      <div v-else-if="records.length === 0" class="empty-state">
        <div class="empty-icon empty-icon-block" aria-hidden="true"></div>
        <p>{{ $t('incomeForm.noIncomeYet') }}</p>
      </div>
      <div v-else class="records-list">
        <div
          v-for="record in records"
          :key="record.id"
          class="record-card"
        >
          <div class="record-header">
            <h4 class="record-date">{{ formatDate(record.created_at) }}</h4>
            <span class="status-badge" :class="incomeStatusClass(record.status)">
              {{ incomeStatusLabel(record.status) }}
            </span>
          </div>
          <div class="record-body">
            <div class="record-info-grid">
              <div class="record-info-item">
                <span class="detail-label">{{ $t('ui.area') }}</span>
                <span class="detail-value">{{ record.area_hectares }} {{ $t('incomeForm.hectares') }}</span>
              </div>
              <div class="record-info-item">
                <span class="detail-label">{{ $t('ui.planting') }}</span>
                <span class="detail-value">{{ formatPlanting(record.planting_method) }}</span>
              </div>
              <div class="record-info-item">
                <span class="detail-label">{{ $t('ui.irrigation') }}</span>
                <span class="detail-value">{{ formatIrrigation(record.irrigation_type) }}</span>
              </div>
              <div class="record-info-item record-info-item-wide">
                <span class="detail-label">{{ $t('ui.harvest') }}</span>
                <span class="detail-value">{{ $t('incomeForm.harvestLine', { sacks: record.sacks_harvested, kg: record.kg_per_sack, price: record.price_per_kg }) }}</span>
              </div>
            </div>
          </div>
          <div class="record-financials">
            <div class="financial-item income">
              <span class="financial-label">{{ $t('ui.sales') }}</span>
              <span class="financial-value">₱{{ parseFloat(record.gross_income || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
            </div>
            <div class="financial-item expense">
              <span class="financial-label">{{ $t('ui.expenses') }}</span>
              <span class="financial-value">₱{{ parseFloat(record.total_expenses || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
            </div>
            <div class="financial-item" :class="parseFloat(record.net_income || 0) >= 0 ? 'profit' : 'loss'">
              <span class="financial-label">{{ $t('ui.net') }}</span>
              <span class="financial-value">₱{{ parseFloat(record.net_income || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
            </div>
          </div>
          <div class="record-actions">
            <button
              v-if="canEditIncomeRecord(record)"
              type="button"
              class="edit-btn"
              @click="startEdit(record)"
            >{{ $t('common.edit') }}</button>
            <button type="button" class="view-btn" @click="openRecordDetail(record)">{{ $t('common.view') }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ASSISTANCE TAB -->
    <div v-if="activeTab === 'assistance'" class="assistance-wrapper">
      <div v-if="loadingAssistance" class="loading-state">
        <div class="spinner"></div>
        <p>{{ $t('incomeForm.loadingAssistance') }}</p>
      </div>
      <div v-else-if="completedAssistance.length === 0" class="empty-state">
        <div class="empty-icon empty-icon-block" aria-hidden="true"></div>
        <p>{{ $t('incomeForm.noAssistanceWait') }}</p>
      </div>
      <div v-else>
        <!-- Assistance Grid -->
        <div class="assistance-grid">
          <div v-for="assist in completedAssistance" :key="assist.id" class="assistance-card">
            <div class="card-header">
              <div class="header-title">
                <span class="assistance-type-badge" :class="getAssistanceTypeClass(assist.assistance_type)">
                  {{ formatAssistanceType(assist.assistance_type) }}
                </span>
              </div>
              <span class="status-badge completed">{{ $t('ui.received') }}</span>
            </div>

            <div class="card-body">
              <div class="info-row">
                <div class="info-item">
                  <span class="info-label">{{ $t('ui.recordDate') }}</span>
                  <span class="info-value">{{ formatDate(assist.created_at) }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">{{ $t('ui.quantity') }}</span>
                  <span class="info-value quantity-highlight">{{ formatAssistanceQuantity(assist) }}</span>
                </div>
              </div>

              <div class="info-row dates-row">
                <div v-if="assist.distribution_date" class="info-item">
                  <span class="info-label">{{ $t('ui.distributionDay') }}</span>
                  <span class="info-value">{{ formatDate(assist.distribution_date) }}</span>
                </div>
                <div v-if="assist.received_date" class="info-item">
                  <span class="info-label">{{ $t('ui.receivedDay') }}</span>
                  <span class="info-value">{{ formatDate(assist.received_date) }}</span>
                </div>
              </div>

              <div v-if="extractNotesOnly(assist.notes)" class="notes-section">
                <span class="notes-label">{{ $t('ui.note') }}</span>
                <p class="notes-content">{{ extractNotesOnly(assist.notes) }}</p>
              </div>
            </div>

            <div class="card-footer">
              <span class="badge-info">{{ getTimeSinceReceived(assist.received_date || assist.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- PREDICTIVE TAB -->
    <div v-if="activeTab === 'predictive'" class="predictive-wrapper">
      <div class="form-section">
        <h2 class="section-title">{{ $t('incomeForm.predictedExpenses') }}</h2>

        <div class="form-row">
          <div class="form-group">
            <label>{{ $t('incomeForm.targetFarmerId') }}</label>
            <input v-if="!isPresident" type="text" :value="targetFarmerId || '-'" disabled />
            <select v-else v-model="selectedForecastFarmerId" @change="loadPredictiveData">
              <option value="">{{ $t('ui.chooseFarmer') }}</option>
              <option v-for="f in barangayFarmers" :key="f.id" :value="String(f.id)">
                #{{ f.id }} - {{ f.full_name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>{{ $t('incomeForm.foundationData') }}</label>
            <input type="file" accept=".csv,.json,text/csv,application/json" @change="onFoundationFileChange" />
          </div>
        </div>

        <div class="predictive-actions">
          <button class="btn-submit" type="button" :disabled="foundationUploading || !canUploadFoundation" @click="uploadFoundationFile">
            <span v-if="foundationUploading">{{ $t('common.uploading') }}</span>
            <span v-else>{{ $t('common.uploadFoundation') }}</span>
          </button>
          <button class="btn-submit" type="button" :disabled="forecastLoading || !targetFarmerId" @click="fetchExpenseForecast">
            <span v-if="forecastLoading">{{ $t('common.forecasting') }}</span>
            <span v-else>{{ $t('common.runForecast') }}</span>
          </button>
        </div>

        <div class="foundation-summary" v-if="foundationSummary">
          <p><strong>{{ $t('incomeForm.foundationFarmerId') }}</strong> {{ foundationSummary.farmer_id }}</p>
          <p><strong>{{ $t('incomeForm.uploadedPoints') }}</strong> {{ foundationSummary.count || 0 }}</p>
          <p v-if="foundationSummary.updated_at"><strong>{{ $t('incomeForm.lastUpdated') }}</strong> {{ formatDate(foundationSummary.updated_at) }}</p>
          <p v-if="(foundationSummary.preview || []).length > 0">
            <strong>{{ $t('incomeForm.preview') }}</strong> {{ foundationSummary.preview.join(', ') }}
          </p>
        </div>
      </div>

      <div class="form-section" v-if="forecastResult">
        <h3 class="section-title">{{ $t('incomeForm.forecastResult') }}</h3>
        <div v-if="forecastResult.ok" class="summary-grid">
          <div class="summary-item expense">
            <span class="summary-label">{{ $t('incomeForm.predictedFutureExpense') }}</span>
            <span class="summary-value">₱{{ formatPeso(forecastResult.forecast_next?.predicted_total_expenses) }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">{{ $t('incomeForm.ci95') }}</span>
            <span class="summary-value">
              ₱{{ formatPeso(forecastResult.forecast_next?.ci95_low) }} - ₱{{ formatPeso(forecastResult.forecast_next?.ci95_high) }}
            </span>
          </div>
          <div class="summary-item">
            <span class="summary-label">{{ $t('incomeForm.modelQuality') }}</span>
            <span class="summary-value">{{ forecastResult.forecast_next?.r_squared ?? '—' }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">{{ $t('incomeForm.trainingPoints') }}</span>
            <span class="summary-value">{{ forecastResult.training_n || 0 }}</span>
          </div>
        </div>
        <div v-else class="alert alert-error">
          <span>{{ translatedForecastError || $t('incomeForm.forecastFailed') }}</span>
        </div>

        <div class="model-info-box" v-if="forecastResult.ok">
          <p><strong>{{ $t('incomeForm.modelUsed') }}</strong> {{ forecastResult.model || 'N/A' }}</p>
          <p>
            <strong>{{ $t('incomeForm.engine') }}</strong>
            {{ forecastEngineLabel }}
          </p>
          <p>{{ forecastMethodText }}</p>
          <p v-if="forecastQualityHint">{{ forecastQualityHint }}</p>
        </div>
        <div v-if="forecastHistory.length" class="foundation-summary">
          <p class="forecast-history-title"><strong>{{ $t('incomeForm.savedExpensesUsed') }}</strong></p>
          <div class="forecast-history-wrap">
            <table class="forecast-history-table">
              <thead>
                <tr>
                  <th class="col-num">#</th>
                  <th>{{ $t('incomeForm.forecastSource') }}</th>
                  <th>{{ $t('incomeForm.forecastPeriod') }}</th>
                  <th class="col-amt">{{ $t('ui.expenses') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in forecastHistory" :key="idx">
                  <td class="col-num">{{ idx + 1 }}</td>
                  <td>{{ forecastHistorySource(row) }}</td>
                  <td>{{ forecastHistoryPeriod(row) }}</td>
                  <td class="col-amt">₱{{ formatPeso(row.total_expenses) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- VIEW DETAIL MODAL -->
    <Teleport to="body">
      <div
        v-if="showDetailModal"
        class="modal-overlay farmer-income-page-modal"
        :class="{ 'light-theme': isLight }"
        @click.self="closeDetailModal"
      >
        <div class="modal-container">
          <div class="modal-header">
            <h2>{{ $t('ui.fullRecordDetails') }}</h2>
            <button class="modal-close" @click="closeDetailModal">&times;</button>
          </div>
          <div class="modal-body" v-if="selectedRecord">

            <!-- Farm Info -->
            <div class="detail-section">
              <h3 class="detail-section-title">{{ $t('incomeForm.farmDetails') }}</h3>
              <div class="detail-grid">
                <div class="detail-cell">
                  <span class="cell-label">{{ $t('ui.status') }}</span>
                  <span class="cell-value">
                    <span class="status-badge" :class="incomeStatusClass(selectedRecord.status)">
                      {{ incomeStatusLabel(selectedRecord.status) }}
                    </span>
                  </span>
                </div>
                <div class="detail-cell">
                  <span class="cell-label">{{ $t('ui.recordDate') }}</span>
                  <span class="cell-value">{{ formatDate(selectedRecord.created_at) }}</span>
                </div>
                <div class="detail-cell">
                  <span class="cell-label">{{ $t('incomeForm.areaHectares') }}</span>
                  <span class="cell-value">{{ selectedRecord.area_hectares }}</span>
                </div>
                <div class="detail-cell">
                  <span class="cell-label">{{ $t('incomeForm.plantingMethod') }}</span>
                  <span class="cell-value">{{ formatPlanting(selectedRecord.planting_method) }}</span>
                </div>
                <div class="detail-cell">
                  <span class="cell-label">{{ $t('ui.irrigation') }}</span>
                  <span class="cell-value">{{ formatIrrigation(selectedRecord.irrigation_type) }}</span>
                </div>
              </div>
            </div>

            <!-- Fertilizers -->
            <div class="detail-section" v-if="selectedRecord.fertilizers && selectedRecord.fertilizers.length > 0">
              <h3 class="detail-section-title">{{ $t('incomeForm.fertilizersUsed') }}</h3>
              <div class="detail-table-wrap">
              <table class="detail-table">
                <thead>
                  <tr>
                    <th>{{ $t('ui.classLabel') }}</th>
                    <th>{{ $t('ui.sacks') }}</th>
                    <th>{{ $t('ui.pricePerSack') }}</th>
                    <th>{{ $t('ui.total') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="f in selectedRecord.fertilizers" :key="f.id">
                    <td>{{ f.fertilizer_type }}</td>
                    <td>{{ f.sacks }}</td>
                    <td>₱{{ parseFloat(f.price_per_sack || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
                    <td class="amt">₱{{ parseFloat(f.line_total || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="3" class="foot-label">{{ $t('ui.fertilizerTotalColon') }}</td>
                    <td class="foot-value">₱{{ parseFloat(selectedRecord.total_fertilizer_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
                  </tr>
                </tfoot>
              </table>
              </div>
            </div>
            <div class="detail-section" v-else>
              <h3 class="detail-section-title">{{ $t('incomeForm.fertilizersUsed') }}</h3>
              <p class="no-data">{{ $t('ui.noFertilizerRecorded') }}</p>
            </div>

            <!-- Pesticides -->
            <div class="detail-section" v-if="selectedRecord.pesticides && selectedRecord.pesticides.length > 0">
              <h3 class="detail-section-title">{{ $t('incomeForm.pesticidesUsed') }}</h3>
              <div class="detail-table-wrap">
              <table class="detail-table">
                <thead>
                  <tr>
                    <th>{{ $t('ui.classLabel') }}</th>
                    <th>{{ $t('ui.count') }}</th>
                    <th>{{ $t('ui.pricePerUnit') }}</th>
                    <th>{{ $t('ui.total') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in selectedRecord.pesticides" :key="p.id">
                    <td>{{ p.pesticide_type }}</td>
                    <td>{{ p.quantity }}</td>
                    <td>₱{{ parseFloat(p.price_per_unit || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
                    <td class="amt">₱{{ parseFloat(p.line_total || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="3" class="foot-label">{{ $t('ui.pesticideTotalColon') }}</td>
                    <td class="foot-value">₱{{ parseFloat(selectedRecord.total_pesticide_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
                  </tr>
                </tfoot>
              </table>
              </div>
            </div>
            <div class="detail-section" v-else>
              <h3 class="detail-section-title">{{ $t('incomeForm.pesticidesUsed') }}</h3>
              <p class="no-data">{{ $t('ui.noPesticideRecorded') }}</p>
            </div>

            <!-- Labor & Expenses -->
            <div class="detail-section">
              <h3 class="detail-section-title">{{ $t('incomeForm.laborOther') }}</h3>
              <div class="expense-grid">
                <div class="expense-row">
                  <span>{{ $t('ui.landPrep') }}</span>
                  <span>₱{{ parseFloat(selectedRecord.land_preparation_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="expense-row">
                  <span>{{ $t('incomeForm.plantingCostShort') }}</span>
                  <span>₱{{ parseFloat(selectedRecord.planting_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="expense-row">
                  <span>{{ $t('incomeForm.sprayingCostShort') }}</span>
                  <span>₱{{ parseFloat(selectedRecord.spraying_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="expense-row">
                  <span>{{ $t('incomeForm.harvesterCostShort') }}</span>
                  <span>₱{{ parseFloat(selectedRecord.harvester_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="expense-row">
                  <span>{{ $t('incomeForm.dryingCostShort') }}</span>
                  <span>₱{{ parseFloat(selectedRecord.drying_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="expense-row">
                  <span>{{ $t('incomeForm.haulingCostShort') }}</span>
                  <span>₱{{ parseFloat(selectedRecord.hauling_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="expense-row">
                  <span>{{ $t('incomeForm.taraskoCostShort') }}</span>
                  <span>₱{{ parseFloat(selectedRecord.tarasko_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="expense-row">
                  <span>{{ $t('incomeForm.fuelCostShort') }}</span>
                  <span>₱{{ parseFloat(selectedRecord.fuel_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="expense-row">
                  <span>{{ $t('incomeForm.otherExpensesShort') }}</span>
                  <span>₱{{ parseFloat(selectedRecord.other_expenses || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="expense-row total-row">
                  <span>{{ $t('incomeForm.totalLabor') }}</span>
                  <span>₱{{ parseFloat(selectedRecord.total_labor_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
              </div>
            </div>

            <!-- Harvest -->
            <div class="detail-section">
              <h3 class="detail-section-title">{{ $t('ui.harvest') }}</h3>
              <div class="detail-grid">
                <div class="detail-cell">
                  <span class="cell-label">{{ $t('ui.sacksHarvested') }}</span>
                  <span class="cell-value">{{ selectedRecord.sacks_harvested }}</span>
                </div>
                <div class="detail-cell">
                  <span class="cell-label">{{ $t('incomeForm.kgPerSack') }}</span>
                  <span class="cell-value">{{ selectedRecord.kg_per_sack }} kg</span>
                </div>
                <div class="detail-cell">
                  <span class="cell-label">{{ $t('incomeForm.pricePerKg') }}</span>
                  <span class="cell-value">₱{{ parseFloat(selectedRecord.price_per_kg || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="detail-cell">
                  <span class="cell-label">{{ $t('incomeForm.totalHarvestKg') }}</span>
                  <span class="cell-value">{{ (parseFloat(selectedRecord.sacks_harvested || 0) * parseFloat(selectedRecord.kg_per_sack || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }} kg</span>
                </div>
              </div>
            </div>

            <!-- Grand Summary -->
            <div class="detail-section summary-detail-section">
              <h3 class="detail-section-title">{{ $t('incomeForm.summary') }}</h3>
              <div class="grand-summary">
                <div class="grand-row income-row">
                  <span>{{ $t('incomeForm.totalSales') }}</span>
                  <span>₱{{ parseFloat(selectedRecord.gross_income || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="grand-row expense-summary-row">
                  <span>{{ $t('ui.totalExpenses') }}</span>
                  <span>₱{{ parseFloat(selectedRecord.total_expenses || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="grand-row" :class="parseFloat(selectedRecord.net_income || 0) >= 0 ? 'net-profit-row' : 'net-loss-row'">
                  <span>{{ $t('incomeForm.netIncome') }}</span>
                  <span>₱{{ parseFloat(selectedRecord.net_income || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
              </div>
            </div>

          </div>
          <div class="modal-footer">
            <button class="btn-close-modal" @click="closeDetailModal">{{ $t('common.close') }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/authStore'
import { useBackdropTheme } from '../composables/useBackdropTheme'

const { t, locale } = useI18n()

const { isDark } = useBackdropTheme()
const isLight = computed(() => !isDark.value)

const authStore = useAuthStore()
const route = useRoute()
const currentUser = computed(() => authStore.currentUser)

const activeTab = ref('form')
const successMessage = ref('')
const errorMessage = ref('')
const submitting = ref(false)
const loadingRecords = ref(false)
const records = ref([])
const loadingAssistance = ref(false)
const completedAssistance = ref([])
const showDetailModal = ref(false)
const selectedRecord = ref(null)
const editingRecordId = ref(null)
const editingCreatedAt = ref(null)
const forecastLoading = ref(false)
const foundationUploading = ref(false)
const forecastResult = ref(null)
const foundationSummary = ref(null)
const foundationFile = ref(null)
const barangayFarmers = ref([])
const selectedForecastFarmerId = ref('')
const isPresident = computed(() => String(currentUser.value?.role || '') === 'president')
const targetFarmerId = computed(() => {
  if (isPresident.value) return selectedForecastFarmerId.value || ''
  return currentUser.value?.id != null ? String(currentUser.value.id) : ''
})
const canUploadFoundation = computed(() => !!foundationFile.value && !!targetFarmerId.value)
const forecastHistory = computed(() => {
  const rows = forecastResult.value?.history
  return Array.isArray(rows) ? rows : []
})
const forecastEngineLabel = computed(() => {
  const engine = forecastResult.value?.ml_engine
  if (engine === 'python_sklearn') return t('incomeForm.enginePython')
  if (engine === 'node_sparse_fallback') return t('incomeForm.engineSparse')
  return t('incomeForm.engineOls')
})
const forecastMethodText = computed(() => {
  const model = forecastResult.value?.model
  const engine = forecastResult.value?.ml_engine
  if (model === 'last_saved_expense') return t('incomeForm.methodLastSaved')
  if (model === 'two_point_trend') return t('incomeForm.methodTwoPoint')
  if (engine === 'python_sklearn') return t('incomeForm.methodPython')
  if (engine === 'node_ols_fallback') return t('incomeForm.methodOls')
  return ''
})
const forecastQualityHint = computed(() => {
  const engine = forecastResult.value?.ml_engine
  if (engine === 'node_sparse_fallback') return t('incomeForm.qualityHintSparse')
  if (forecastResult.value?.forecast_quality_hint_ph) return t('incomeForm.qualityHintLow')
  return ''
})
const translatedForecastError = computed(() => {
  const err = String(forecastResult.value?.error || '')
  if (!err) return ''
  if (/Wala pang naka-save/i.test(err)) return t('incomeForm.noRecordsForForecast')
  if (/Kulang ang datos/i.test(err)) return t('incomeForm.notEnoughRecords')
  if (/Hindi kayang i-fit/i.test(err)) return t('incomeForm.forecastFitFailed')
  return t('incomeForm.forecastFailed')
})

const syncActiveTabFromRoute = async () => {
  const requestedTab = String(route.query.tab || '').trim()

  if (requestedTab === 'history') {
    activeTab.value = 'history'
    await fetchRecords()
    return
  }

  if (requestedTab === 'assistance') {
    activeTab.value = 'assistance'
    await fetchCompletedAssistance()
    return
  }

  if (requestedTab === 'predictive') {
    activeTab.value = 'predictive'
    await loadPredictiveData()
  }
}

// ─── Detail modal ───
const openRecordDetail = (record) => {
  selectedRecord.value = record
  showDetailModal.value = true
}
const closeDetailModal = () => {
  showDetailModal.value = false
  selectedRecord.value = null
}

watch(
  showDetailModal,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
  },
  { immediate: true }
)

onUnmounted(() => {
  document.body.style.overflow = ''
})

// ─── Form State ───
const getInitialForm = () => ({
  area_hectares: null,
  planting_method: '',
  irrigation_type: '',
  fertilizers: [{ type: '', sacks: null, price_per_sack: null }],
  pesticides: [{ type: '', quantity: null, price_per_unit: null }],
  land_preparation_cost: 0,
  planting_cost: 0,
  spraying_cost: 0,
  harvester_cost: 0,
  drying_cost: 0,
  hauling_cost: 0,
  tarasko_cost: 0,
  fuel_cost: 0,
  other_expenses: 0,
  sacks_harvested: null,
  kg_per_sack: null,
  price_per_kg: null
})

const form = ref(getInitialForm())

// ─── Fertilizer helpers ───
const addFertilizer = () => {
  form.value.fertilizers.push({ type: '', sacks: null, price_per_sack: null })
}
const removeFertilizer = (index) => {
  form.value.fertilizers.splice(index, 1)
}
const fertilizerLineTotal = (item) => (item.sacks || 0) * (item.price_per_sack || 0)
const totalFertilizerCost = computed(() =>
  form.value.fertilizers.reduce((sum, f) => sum + fertilizerLineTotal(f), 0)
)

// ─── Pesticide helpers ───
const addPesticide = () => {
  form.value.pesticides.push({ type: '', quantity: null, price_per_unit: null })
}
const removePesticide = (index) => {
  form.value.pesticides.splice(index, 1)
}
const pesticideLineTotal = (item) => (item.quantity || 0) * (item.price_per_unit || 0)
const totalPesticideCost = computed(() =>
  form.value.pesticides.reduce((sum, p) => sum + pesticideLineTotal(p), 0)
)

// ─── Labor totals ───
const totalLaborCost = computed(() =>
  (form.value.land_preparation_cost || 0) +
  (form.value.planting_cost || 0) +
  (form.value.spraying_cost || 0) +
  (form.value.harvester_cost || 0) +
  (form.value.drying_cost || 0) +
  (form.value.hauling_cost || 0) +
  (form.value.tarasko_cost || 0) +
  (form.value.fuel_cost || 0) +
  (form.value.other_expenses || 0)
)

// ─── Harvest & income ───
const totalHarvestKg = computed(() => (form.value.sacks_harvested || 0) * (form.value.kg_per_sack || 0))
const grossIncome = computed(() => totalHarvestKg.value * (form.value.price_per_kg || 0))
const totalExpenses = computed(() =>
  totalFertilizerCost.value + totalPesticideCost.value + totalLaborCost.value
)
const netIncome = computed(() => grossIncome.value - totalExpenses.value)

// ─── Submit (create or update) ───
const submitForm = async () => {
  if (!currentUser.value?.id) {
    errorMessage.value = t('incomeForm.loginRequired')
    return
  }
  submitting.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const payload = {
      farmer_id: currentUser.value.id,
      area_hectares: form.value.area_hectares,
      planting_method: form.value.planting_method,
      irrigation_type: form.value.irrigation_type,
      fertilizers: form.value.fertilizers.filter(f => f.type),
      pesticides: form.value.pesticides.filter(p => p.type),
      land_preparation_cost: form.value.land_preparation_cost || 0,
      planting_cost: form.value.planting_cost || 0,
      spraying_cost: form.value.spraying_cost || 0,
      harvester_cost: form.value.harvester_cost || 0,
      drying_cost: form.value.drying_cost || 0,
      hauling_cost: form.value.hauling_cost || 0,
      tarasko_cost: form.value.tarasko_cost || 0,
      fuel_cost: form.value.fuel_cost || 0,
      other_expenses: form.value.other_expenses || 0,
      sacks_harvested: form.value.sacks_harvested,
      kg_per_sack: form.value.kg_per_sack,
      price_per_kg: form.value.price_per_kg,
      total_fertilizer_cost: totalFertilizerCost.value,
      total_pesticide_cost: totalPesticideCost.value,
      total_labor_cost: totalLaborCost.value,
      gross_income: grossIncome.value,
      total_expenses: totalExpenses.value,
      net_income: netIncome.value
    }

    let res
    if (editingRecordId.value) {
      // UPDATE
      res = await fetch(`/api/farmer-income/${editingRecordId.value}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.token}`
        },
        body: JSON.stringify(payload)
      })
    } else {
      // CREATE
      res = await fetch('/api/farmer-income', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.token}`
        },
        body: JSON.stringify(payload)
      })
    }
    const data = await res.json()
    if (!res.ok) throw new Error(t('incomeForm.saveFailed'))

    successMessage.value = editingRecordId.value
      ? t('incomeForm.updateSuccess')
      : t('incomeForm.saveSuccess')
    cancelEdit()
  } catch (err) {
    errorMessage.value = err.message
  } finally {
    submitting.value = false
  }
}

// ─── Edit helpers ───
const startEdit = (record) => {
  if (!canEditIncomeRecord(record)) return
  editingRecordId.value = record.id
  editingCreatedAt.value = record.created_at

  // Map fertilizers from DB format to form format
  const fertilizers = (record.fertilizers && record.fertilizers.length > 0)
    ? record.fertilizers.map(f => ({
        type: f.fertilizer_type,
        sacks: f.sacks,
        price_per_sack: parseFloat(f.price_per_sack)
      }))
    : [{ type: '', sacks: null, price_per_sack: null }]

  // Map pesticides from DB format to form format
  const pesticides = (record.pesticides && record.pesticides.length > 0)
    ? record.pesticides.map(p => ({
        type: p.pesticide_type,
        quantity: p.quantity,
        price_per_unit: parseFloat(p.price_per_unit)
      }))
    : [{ type: '', quantity: null, price_per_unit: null }]

  form.value = {
    area_hectares: parseFloat(record.area_hectares),
    planting_method: record.planting_method,
    irrigation_type: record.irrigation_type,
    fertilizers,
    pesticides,
    land_preparation_cost: parseFloat(record.land_preparation_cost) || 0,
    planting_cost: parseFloat(record.planting_cost) || 0,
    spraying_cost: parseFloat(record.spraying_cost) || 0,
    harvester_cost: parseFloat(record.harvester_cost) || 0,
    drying_cost: parseFloat(record.drying_cost) || 0,
    hauling_cost: parseFloat(record.hauling_cost) || 0,
    tarasko_cost: parseFloat(record.tarasko_cost) || 0,
    fuel_cost: parseFloat(record.fuel_cost) || 0,
    other_expenses: parseFloat(record.other_expenses) || 0,
    sacks_harvested: record.sacks_harvested,
    kg_per_sack: parseFloat(record.kg_per_sack),
    price_per_kg: parseFloat(record.price_per_kg)
  }

  activeTab.value = 'form'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const cancelEdit = () => {
  editingRecordId.value = null
  editingCreatedAt.value = null
  resetForm()
}

// ─── Fetch history ───
const fetchRecords = async () => {
  if (!currentUser.value?.id) return
  loadingRecords.value = true
  try {
    const res = await fetch(`/api/farmer-income/${currentUser.value.id}`)
    const data = await res.json()
    if (!res.ok) throw new Error(t('incomeForm.fetchRecordsError'))
    records.value = data
  } catch (err) {
    errorMessage.value = err.message
  } finally {
    loadingRecords.value = false
  }
}

const fetchCompletedAssistance = async () => {
  if (!currentUser.value?.id) return
  loadingAssistance.value = true
  try {
    const endpoint = currentUser.value.role === 'admin' 
      ? '/api/farmer-income/distribution/completed/all'
      : `/api/farmer-income/distribution/completed/${currentUser.value.id}`
    
    const res = await fetch(endpoint, {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(t('incomeForm.fetchAssistanceError'))
    completedAssistance.value = data
  } catch (err) {
    errorMessage.value = err.message
  } finally {
    loadingAssistance.value = false
  }
}

const fetchBarangayFarmers = async () => {
  if (!isPresident.value || !currentUser.value?.barangay_id) return
  try {
    const res = await fetch(`/api/farmer-income/barangay-farmers/${currentUser.value.barangay_id}`, {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    const data = await res.json()
    if (!res.ok || !data?.ok) throw new Error(t('incomeForm.fetchFarmersError'))
    barangayFarmers.value = data.farmers || []
    if (!selectedForecastFarmerId.value && barangayFarmers.value.length > 0) {
      selectedForecastFarmerId.value = String(barangayFarmers.value[0].id)
    }
  } catch (err) {
    errorMessage.value = err.message
  }
}

const fetchFoundationSummary = async () => {
  if (!targetFarmerId.value) return
  try {
    const res = await fetch(`/api/farmer-income/expense-history-foundation/${targetFarmerId.value}`, {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    const data = await res.json()
    if (!res.ok || !data?.ok) throw new Error(t('incomeForm.fetchFoundationError'))
    foundationSummary.value = data
  } catch (err) {
    foundationSummary.value = null
    errorMessage.value = err.message
  }
}

const fetchExpenseForecast = async () => {
  if (!targetFarmerId.value) return
  forecastLoading.value = true
  forecastResult.value = null
  try {
    const res = await fetch(`/api/farmer-income/expense-forecast/${targetFarmerId.value}`, {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    const data = await res.json()
    forecastResult.value = data
    if (!res.ok) {
      throw new Error(t('incomeForm.forecastFailed'))
    }
  } catch (err) {
    errorMessage.value = err.message
  } finally {
    forecastLoading.value = false
  }
}

const onFoundationFileChange = (event) => {
  const f = event?.target?.files?.[0]
  foundationFile.value = f || null
}

const uploadFoundationFile = async () => {
  if (!foundationFile.value || !targetFarmerId.value) return
  foundationUploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', foundationFile.value)
    const res = await fetch(`/api/farmer-income/expense-history-foundation/${targetFarmerId.value}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authStore.token}` },
      body: formData
    })
    const data = await res.json()
    if (!res.ok || !data?.ok) throw new Error(t('incomeForm.uploadFailed'))
    successMessage.value = t('incomeForm.foundationUploaded')
    foundationFile.value = null
    await fetchFoundationSummary()
    await fetchExpenseForecast()
  } catch (err) {
    errorMessage.value = err.message
  } finally {
    foundationUploading.value = false
  }
}

const loadPredictiveData = async () => {
  if (isPresident.value && barangayFarmers.value.length === 0) {
    await fetchBarangayFarmers()
  }
  await fetchFoundationSummary()
  await fetchExpenseForecast()
}

// ─── Helpers ───
const resetForm = () => {
  form.value = getInitialForm()
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const loc = locale.value === 'tl' ? 'fil-PH' : 'en-PH'
  return new Date(dateStr).toLocaleDateString(loc, {
    year: 'numeric', month: 'long', day: 'numeric'
  })
}

const normalizeIncomeStatus = (status) => {
  const s = String(status || 'Pending').trim()
  if (s === 'Eligible' || s === 'Upcoming Assistance' || s === 'Received') return 'Eligible'
  if (s === 'Rejected') return 'Rejected'
  return 'Pending'
}

const incomeStatusLabel = (status) => {
  const s = normalizeIncomeStatus(status)
  if (s === 'Eligible') return t('ui.eligible')
  if (s === 'Rejected') return t('common.rejected')
  return t('common.pending')
}

const incomeStatusClass = (status) => normalizeIncomeStatus(status).toLowerCase()

const canEditIncomeRecord = (record) => {
  const s = normalizeIncomeStatus(record?.status)
  return s === 'Pending' || s === 'Rejected'
}

const formatPeso = (value) => {
  const n = parseFloat(value || 0)
  if (!Number.isFinite(n)) return '0.00'
  return n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const formatIrrigation = (type) => {
  const map = {
    NIA: 'incomeForm.nia',
    bugsok_waterpump: 'incomeForm.bugsokPump',
    waterpump_irrigation: 'incomeForm.pumpIrrigation',
    waterpump_ilog: 'incomeForm.pumpRiver'
  }
  return map[type] ? t(map[type]) : (type || '-')
}

const formatPlanting = (method) => {
  if (method === 'sabog') return t('incomeForm.sabog')
  if (method === 'talok') return t('incomeForm.talok')
  return method || '-'
}

const formatAssistanceType = (type) => {
  const map = {
    fertilizer: 'incomeForm.assistFertilizer',
    seeds: 'incomeForm.assistSeeds',
    both: 'incomeForm.assistBoth'
  }
  return map[type] ? t(map[type]) : type
}

const forecastHistorySource = (row) => {
  if (row?.source === 'upload') return t('incomeForm.foundationSource')
  return t('incomeForm.savedRecordSource')
}

const forecastHistoryPeriod = (row) => {
  const pi = Number(row?.period_index)
  if (Number.isFinite(pi) && pi > 0) return String(pi)
  return '—'
}

const extractQuantityFromNotes = (notes) => {
  if (!notes) return ''
  const quantityPart = notes.split(' - ')[0]
  return quantityPart.trim()
}

const parseAssistanceQty = (notes) => {
  if (!notes) return null
  const quantityPart = notes.split(' - ')[0]
  const fert = quantityPart.match(/(?:Pataba|Fertilizer):\s*([\d.]+)/i)
  const seeds = quantityPart.match(/(?:Binhi|Seeds):\s*([\d.]+)/i)
  if (!fert && !seeds) return null
  return {
    fertilizer: fert ? fert[1] : '0',
    seeds: seeds ? seeds[1] : '0'
  }
}

const formatAssistanceQuantity = (assist) => {
  const parsed = parseAssistanceQty(assist?.notes)
  if (parsed) return t('ui.assistQtyLine', parsed)
  const unit = assist?.unit && assist.unit !== 'sako' ? assist.unit : t('incomeForm.sacksUnit')
  if (assist?.notes) {
    const leftover = extractQuantityFromNotes(assist.notes)
    if (leftover && leftover !== assist.notes) return leftover
  }
  return `${assist?.quantity ?? 0} ${unit}`
}

const extractNotesOnly = (notes) => {
  if (!notes) return ''
  const parts = notes.split(' - ')
  return parts.length > 1 ? parts[1] : ''
}

const countAssistanceByType = (type) => {
  return completedAssistance.value.filter(a => a.assistance_type === type).length
}

const getAssistanceTypeClass = (type) => {
  const map = {
    'fertilizer': 'type-fertilizer',
    'seeds': 'type-seeds',
    'both': 'type-both'
  }
  return map[type] || 'type-other'
}

const getTimeSinceReceived = (dateStr) => {
  if (!dateStr) return t('incomeForm.recently')
  const date = new Date(dateStr)
  const now = new Date()
  const days = Math.floor((now - date) / (1000 * 60 * 60 * 24))

  if (days === 0) return t('incomeForm.today')
  if (days === 1) return t('incomeForm.yesterday')
  if (days < 7) return t('incomeForm.daysAgo', { n: days })
  if (days < 30) return t('incomeForm.weeksAgo', { n: Math.floor(days / 7) })
  if (days < 365) return t('incomeForm.monthsAgo', { n: Math.floor(days / 30) })
  return t('incomeForm.yearsAgo', { n: Math.floor(days / 365) })
}

onMounted(() => {
  syncActiveTabFromRoute()
  if (isPresident.value) fetchBarangayFarmers()
})

watch(() => route.query.tab, () => {
  syncActiveTabFromRoute()
})

watch(targetFarmerId, async (id) => {
  if (!id) return
  if (activeTab.value === 'predictive') {
    await fetchFoundationSummary()
    await fetchExpenseForecast()
  }
})
</script>

<style scoped>
.page-container.farmer-income-page {
  padding: 2rem;
  max-width: none;
  margin: 0 -1.5rem;
  width: calc(100% + 3rem);
  min-height: calc(100vh - 70px - 3rem);
  box-sizing: border-box;
  border-radius: 18px;
  position: relative;
  overflow-x: hidden;
}

.page-header-split {
  margin-bottom: 2rem;
  padding: 1.25rem 1.4rem 1.1rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-radius: 14px;
  position: relative;
  overflow: hidden;
  background: rgba(28, 42, 33, 0.92);
  border: 1px solid rgba(190, 235, 203, 0.14);
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.3), inset 1px 1px 0 rgba(255, 255, 255, 0.05);
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
  font-size: 2rem;
  font-weight: 800;
  line-height: 1.2;
  margin: 0 0 0.35rem;
  color: #eefde6;
}

.page-subtitle {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.45;
  color: rgba(229, 235, 231, 0.82);
}

.page-container:not(.light-theme) .page-title {
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
}

.page-container:not(.light-theme) .page-subtitle {
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
  opacity: 0.92;
}

/* Alerts (base; teleported stack styled in unscoped block) */
.alert {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  gap: 0.75rem;
  min-width: min(340px, 92vw);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
}
.alert-success {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #6ee7b7;
}
.alert-error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fca5a5;
}
.alert-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: inherit;
  flex-shrink: 0;
}

/* Tab Navigation */
.tab-nav {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 2rem;
  align-items: center;
  flex-wrap: wrap;
}
.tab-btn {
  padding: 0.78rem 1.3rem;
  border: 1px solid rgba(190, 235, 203, 0.28);
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 700;
  color: #ffffff;
  transition: background 0.22s ease, border-color 0.22s ease, transform 0.22s ease;
  box-shadow: none;
  filter: none;
}
.page-container:not(.light-theme) .tab-btn {
  border: 1px solid rgba(190, 235, 203, 0.28) !important;
  background: rgba(255, 255, 255, 0.08) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  box-shadow: none !important;
  filter: none !important;
}
.page-container:not(.light-theme) .tab-btn.active {
  background: rgba(255, 255, 255, 0.14) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  border-color: rgba(134, 239, 172, 0.45) !important;
  box-shadow: none !important;
}
.page-container:not(.light-theme) .tab-btn:hover:not(.active) {
  border-color: rgba(134, 239, 172, 0.4) !important;
  background: rgba(255, 255, 255, 0.12) !important;
  transform: translateY(-1px);
}

.page-container:not(.light-theme) .loading-state,
.page-container:not(.light-theme) .empty-state {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.page-container:not(.light-theme) .card-sub {
  margin: 0 0 1rem 0;
  font-size: 0.92rem;
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
  line-height: 1.45;
  opacity: 0.92;
}

.predictive-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 1rem;
}

.page-container:not(.light-theme) .foundation-summary {
  margin-top: 1rem;
  padding: 0.9rem 1.05rem;
  border: 1px solid rgba(126, 184, 145, 0.32);
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.22);
  font-size: 0.88rem;
  color: rgba(236, 253, 245, 0.9);
}

.foundation-summary p {
  margin: 0.25rem 0;
}

.forecast-history-title {
  margin: 0 0 0.65rem !important;
}

.forecast-history-wrap {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.forecast-history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}

.forecast-history-table th,
.forecast-history-table td {
  text-align: left;
  padding: 0.45rem 0.5rem;
  border-bottom: 1px solid rgba(190, 235, 203, 0.18);
  vertical-align: middle;
}

.forecast-history-table th {
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  opacity: 0.78;
}

.forecast-history-table tbody tr:last-child td {
  border-bottom: none;
}

.forecast-history-table .col-num {
  width: 2.2rem;
  text-align: center;
  white-space: nowrap;
}

.forecast-history-table .col-amt {
  text-align: right;
  font-weight: 800;
  white-space: nowrap;
}

.page-container:not(.light-theme) .forecast-history-table th,
.page-container:not(.light-theme) .forecast-history-table td {
  border-bottom-color: rgba(134, 239, 172, 0.16);
  color: #ecfdf5;
}

.page-container:not(.light-theme) .model-info-box {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid rgba(126, 184, 145, 0.28);
  background: rgba(74, 222, 128, 0.08);
  color: rgba(220, 252, 231, 0.92);
  font-size: 0.88rem;
}

.page-container:not(.light-theme) .model-info-box strong {
  color: #bbf7d0;
}

/* Form Sections — shared geometry (both themes) */
.form-section {
  background: #ffffff;
  border: 1px solid rgba(167, 243, 208, 0.45);
  border-radius: 14px;
  padding: 1.25rem 1.35rem;
  margin-bottom: 1.25rem;
  box-shadow: 0 8px 22px rgba(6, 16, 11, 0.2);
}

.section-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #166534;
  margin: 0 0 0.85rem 0;
  padding-bottom: 0.45rem;
  border-bottom: 1px solid rgba(167, 243, 208, 0.65);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem 0.75rem;
  margin-bottom: 0.5rem;
}

.form-row:last-child {
  margin-bottom: 0;
}

/* accessible.css adds a global 24px gutter to .form-group — the grid gap handles spacing here */
.farmer-income-page .form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 0 !important;
  gap: 0.2rem;
}
.farmer-income-page .form-group.full-width {
  grid-column: 1 / -1;
}
.farmer-income-page .form-group label {
  font-size: 0.88rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 0.15rem 0 !important;
  line-height: 1.25;
  padding: 0;
}

/* Mobile-only stacked labels for the dynamic tables */
.dt-label {
  display: none;
}
.form-group input,
.form-group select {
  padding: 0.55rem 0.7rem;
  border: 1px solid rgba(110, 231, 183, 0.35);
  border-radius: 8px;
  font-size: 0.88rem;
  transition: border-color 0.2s;
  background: rgba(245, 255, 250, 0.9);
  min-height: 38px;
  box-sizing: border-box;
}
.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #16a34a;
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
}

/* Hide number spinners — user types exact amounts; scroll must not change values */
.farmer-income-page input[type='number']::-webkit-outer-spin-button,
.farmer-income-page input[type='number']::-webkit-inner-spin-button,
.farmer-income-page .dynamic-table input[type='number']::-webkit-outer-spin-button,
.farmer-income-page .dynamic-table input[type='number']::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.farmer-income-page input[type='number'],
.farmer-income-page .dynamic-table input[type='number'] {
  -moz-appearance: textfield;
  appearance: textfield;
}

/* Dynamic Tables */
.dynamic-table-wrapper {
  overflow-x: auto;
}
.dynamic-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.dynamic-table th {
  background: #f0fdf4;
  color: #166534;
  font-weight: 600;
  padding: 0.95rem 0.75rem;
  text-align: left;
  border-bottom: 2px solid #bbf7d0;
  white-space: nowrap;
}
.dynamic-table td {
  padding: 0.75rem 0.75rem;
  border-bottom: 1px solid #e5e7eb;
  vertical-align: middle;
}
.dynamic-table td input,
.dynamic-table td select {
  width: 100%;
  padding: 0.4rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.85rem;
  box-sizing: border-box;
}
.dynamic-table td input:focus,
.dynamic-table td select:focus {
  outline: none;
  border-color: #16a34a;
  box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.1);
}
.computed-cell {
  font-weight: 600;
  color: #166534;
  white-space: nowrap;
  min-width: 100px;
}
.total-label {
  text-align: right;
  font-weight: 700;
  color: #374151;
  padding-top: 0.75rem !important;
}
.total-value {
  font-weight: 700;
  color: #166534;
  font-size: 0.95rem;
  padding-top: 0.75rem !important;
  white-space: nowrap;
}
.remove-btn {
  background: #fef2f2;
  color: #dc2626;
  -webkit-text-fill-color: #dc2626;
  border: 1px solid #fca5a5;
  border-radius: 8px;
  width: 32px;
  height: 32px;
  min-width: 32px;
  min-height: 32px;
  padding: 0;
  cursor: pointer;
  font-size: 1.15rem;
  line-height: 1;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
.remove-btn:hover {
  background: #dc2626;
  border-color: #dc2626;
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
}

.dynamic-table td.dt-actions-cell {
  width: 48px;
  text-align: center;
  vertical-align: middle;
  padding: 0.5rem 0.4rem;
}
.add-row-btn {
  margin-top: 0.75rem;
  padding: 0.9rem 1.35rem;
  background: #f0fdf4;
  color: #166534;
  border: 1px dashed #16a34a;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.2s;
}
.add-row-btn:hover {
  background: #dcfce7;
  border-color: #166534;
}

/* Labor Total Box */
.labor-total-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #14532d;
  border: 1px solid rgba(74, 222, 128, 0.55);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-top: 0.75rem;
}
.labor-total-label {
  font-weight: 800;
  font-size: 1.02rem;
  color: #ecfdf5 !important;
}
.labor-total-value {
  font-weight: 900;
  font-size: 1.2rem;
  color: #bbf7d0 !important;
}

/* Summary Section */
.summary-section {
  background: #ecfdf5;
  border: 2px solid #86efac;
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}
.summary-item {
  background: #fff;
  border-radius: 10px;
  padding: 1rem;
  text-align: center;
  border: 1px solid #e5e7eb;
}
.summary-item .summary-label {
  display: block;
  font-size: 0.75rem;
  color: #6b7280;
  margin-bottom: 0.3rem;
  font-weight: 600;
}
.summary-item .summary-value {
  display: block;
  font-size: 1.1rem;
  font-weight: 700;
}
.summary-item.income .summary-value { color: #2563eb; }
.summary-item.expense .summary-value { color: #dc2626; }
.summary-item.profit { border-color: #16a34a; background: #f0fdf4; }
.summary-item.profit .summary-value { color: #166534; }
.summary-item.loss { border-color: #dc2626; background: #fef2f2; }
.summary-item.loss .summary-value { color: #dc2626; }

/* Actions */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 0.5rem 0 1rem;
}
.btn-reset {
  padding: 1rem 1.8rem;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1.05rem;
  transition: all 0.2s;
}
.btn-reset:hover {
  background: #e5e7eb;
}
.btn-submit {
  padding: 1rem 2.4rem;
  background: #166534;
  color: #f0fdf4;
  border: 1px solid rgba(134, 239, 172, 0.38);
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1.05rem;
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
  box-shadow: 0 2px 8px rgba(22, 101, 52, 0.25);
}
.btn-submit:hover:not(:disabled) {
  background: #15803d;
  border-color: rgba(187, 247, 208, 0.45);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(22, 101, 52, 0.32);
}
.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* History */
.loading-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
}
.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top-color: #16a34a;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 1rem;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #9ca3af;
}
.empty-icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.empty-icon-block {
  font-size: 0;
  width: 3.25rem;
  height: 3.25rem;
  margin-left: auto;
  margin-right: auto;
  margin-bottom: 0.75rem;
  border: 2px dashed rgba(107, 159, 126, 0.55);
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.08);
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.record-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 0.85rem 0.9rem 0.75rem;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  gap: 0;
}
.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding-bottom: 0.55rem;
  margin-bottom: 0.45rem;
  border-bottom: 1px solid #e5e7eb;
}
.page-container:not(.light-theme) .record-header {
  border-bottom-color: rgba(134, 239, 172, 0.18);
}
.record-date {
  margin: 0;
  font-weight: 800;
  font-size: 0.95rem;
  line-height: 1.25;
  color: #1f2937;
}
.page-container:not(.light-theme) .record-date {
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
}
.record-body {
  padding: 0;
  margin: 0;
}
.record-info-grid {
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
}
.record-info-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.65rem;
  min-width: 0;
}
.record-info-item-wide {
  grid-column: auto;
}
.detail-label {
  flex-shrink: 0;
  min-width: 5.2rem;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #6b7280;
  padding-top: 0.1rem;
}
.page-container:not(.light-theme) .detail-label {
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
  opacity: 0.7;
}
.detail-value {
  flex: 1;
  min-width: 0;
  text-align: right;
  font-size: 0.84rem;
  font-weight: 600;
  line-height: 1.35;
  word-break: break-word;
  color: #1f2937;
}
.page-container:not(.light-theme) .detail-value {
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
}
.record-financials {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.4rem;
  margin-top: 0.55rem;
  padding-top: 0.55rem;
  border-top: 1px solid #e5e7eb;
}
.page-container:not(.light-theme) .record-financials {
  border-top-color: rgba(134, 239, 172, 0.18);
}
.financial-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.12rem;
  padding: 0.45rem 0.35rem;
  border-radius: 8px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  min-width: 0;
}
.page-container:not(.light-theme) .financial-item {
  background: rgba(0, 0, 0, 0.22);
  border-color: rgba(134, 239, 172, 0.12);
}
.financial-label {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #6b7280;
}
.page-container:not(.light-theme) .financial-label {
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
  opacity: 0.8;
}
.financial-value {
  font-size: 0.78rem;
  font-weight: 800;
  line-height: 1.2;
  text-align: center;
  word-break: break-word;
}
.financial-item.income .financial-value { color: #2563eb; }
.financial-item.expense .financial-value { color: #dc2626; }
.financial-item.profit .financial-value { color: #166534; }
.financial-item.loss .financial-value { color: #dc2626; }

.record-actions {
  display: flex;
  gap: 0.4rem;
  width: 100%;
  margin-top: 0.55rem;
  padding-top: 0.55rem;
  border-top: 1px solid #e5e7eb;
}
.page-container:not(.light-theme) .record-actions {
  border-top-color: rgba(134, 239, 172, 0.18);
}

/* Responsive — Machinery Management parity */
@media (max-width: 768px) {
  .page-container.farmer-income-page {
    margin: 0;
    width: 100%;
    max-width: 100%;
    padding: 0.7rem 0.55rem 1.35rem;
    border-radius: 14px;
    overflow-x: clip;
  }

  .page-header-split {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      "title"
      "subtitle";
    align-items: start;
    column-gap: 0.65rem;
    row-gap: 0.15rem;
    margin-bottom: 0.75rem;
    padding: 0.75rem 0.85rem;
  }

  .page-header-split::after {
    display: none;
  }

  .page-header-text {
    display: contents;
    min-width: 0;
  }

  .page-title {
    grid-area: title;
    font-size: 1.2rem !important;
    margin: 0;
    line-height: 1.25;
  }

  .page-subtitle {
    grid-area: subtitle;
    font-size: 0.75rem;
    line-height: 1.3;
    margin: 0;
  }

  .tab-nav {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.45rem;
    margin-bottom: 0.85rem;
  }

  .tab-btn,
  .page-container:not(.light-theme) .tab-btn {
    padding: 0.55rem 0.4rem !important;
    font-size: 0.72rem !important;
    border-radius: 10px;
    min-height: 42px;
    line-height: 1.25;
    text-align: center;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .form-section {
    padding: 0.65rem 0.7rem !important;
    margin-bottom: 0.55rem !important;
    border-radius: 12px;
  }

  .section-title {
    font-size: 0.9rem;
    margin-bottom: 0.4rem !important;
    padding-bottom: 0.25rem;
  }

  .form-row {
    grid-template-columns: 1fr !important;
    gap: 0.4rem !important;
    margin-bottom: 0.4rem !important;
  }

  .form-row:last-child {
    margin-bottom: 0 !important;
  }

  .farmer-income-page .form-group {
    margin-bottom: 0 !important;
    gap: 0.15rem !important;
  }

  .farmer-income-page .form-group label {
    font-size: 0.78rem !important;
    margin: 0 0 0.2rem 0 !important;
    line-height: 1.3 !important;
    white-space: normal;
  }

  .farmer-income-page .form-group input,
  .farmer-income-page .form-group select,
  .dynamic-table td input,
  .dynamic-table td select {
    padding: 0.55rem 0.65rem !important;
    font-size: 16px !important;
    min-height: 44px !important;
    height: auto !important;
    border-radius: 10px !important;
  }

  .summary-grid {
    grid-template-columns: 1fr 1fr;
    gap: 0.4rem;
  }

  .summary-section .summary-grid {
    margin: 0;
  }

  .summary-item {
    margin: 0;
    padding: 0.55rem 0.5rem;
    border-radius: 8px;
  }

  .summary-item .summary-label {
    font-size: 0.65rem;
    margin-bottom: 0.15rem;
  }

  .summary-item .summary-value {
    font-size: 0.95rem;
  }

  .labor-total-box {
    padding: 0.5rem 0.7rem;
    margin-top: 0.45rem;
  }

  .labor-total-label {
    font-size: 0.8rem;
  }

  .labor-total-value {
    font-size: 0.9rem;
  }

  .add-row-btn {
    width: 100%;
    margin-top: 0.45rem;
    padding: 0.5rem 0.65rem;
    font-size: 0.8rem;
  }

  .record-info-item-wide {
    grid-column: 1 / -1;
  }

  .record-info-item-wide .detail-value,
  .record-info-item .detail-value {
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .predictive-wrapper input[type='file'] {
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }

  .foundation-summary {
    padding: 0.55rem 0.5rem !important;
    margin-top: 0.65rem;
    border-radius: 10px;
  }

  .forecast-history-title {
    margin: 0 0 0.4rem !important;
    font-size: 0.72rem;
    line-height: 1.25;
  }

  .forecast-history-table {
    font-size: 0.68rem;
    min-width: 0;
    table-layout: fixed;
  }

  .forecast-history-table th,
  .forecast-history-table td {
    padding: 0.28rem 0.22rem;
    line-height: 1.2;
  }

  .forecast-history-table th {
    font-size: 0.58rem;
    letter-spacing: 0.02em;
  }

  .forecast-history-table .col-num {
    width: 1.35rem;
    padding-left: 0;
    padding-right: 0.15rem;
  }

  .forecast-history-table .col-amt {
    width: 5.6rem;
    font-size: 0.66rem;
  }

  .model-info-box {
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .predictive-actions {
    flex-direction: column;
    gap: 0.45rem;
  }

  .record-financials {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    gap: 0.35rem;
    margin-top: 0.45rem;
    padding-top: 0.45rem;
  }

  .record-card {
    padding: 0.7rem 0.75rem 0.65rem;
    border-radius: 12px;
  }

  .record-header {
    padding-bottom: 0.4rem;
    margin-bottom: 0.4rem;
  }

  .record-date {
    font-size: 0.9rem;
  }

  .record-actions {
    width: 100%;
    display: flex;
    gap: 0.4rem;
    margin-top: 0.45rem;
    padding-top: 0.45rem;
  }

  .edit-btn,
  .view-btn {
    flex: 1;
    justify-content: center;
    padding: 0.42rem 0.55rem;
    font-size: 0.78rem;
    min-height: 36px;
  }

  .financial-item {
    padding: 0.4rem 0.3rem;
  }

  .financial-value {
    font-size: 0.72rem;
  }

  .records-list {
    gap: 0.55rem;
  }

  .assistance-grid {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .assistance-card {
    border-radius: 10px;
  }

  .assistance-card .card-header {
    padding: 0.4rem 0.55rem;
  }

  .assistance-card .card-body {
    padding: 0.45rem 0.55rem 0.35rem;
  }

  .assistance-card .card-footer {
    padding: 0.25rem 0.55rem;
  }

  .assistance-type-badge,
  .status-badge {
    font-size: 0.62rem;
    padding: 0.14rem 0.42rem;
  }

  .info-row {
    grid-template-columns: 1fr;
    gap: 0.28rem;
    margin-bottom: 0.28rem;
  }

  .info-label {
    font-size: 0.58rem;
  }

  .info-value,
  .quantity-highlight {
    font-size: 0.74rem;
  }

  .predictive-actions {
    flex-direction: column;
    gap: 0.45rem;
  }

  .predictive-actions .btn-submit,
  .predictive-actions .btn-reset {
    width: 100%;
  }

  .form-actions {
    flex-direction: column;
    gap: 0.45rem;
    margin-top: 0.55rem;
  }

  .btn-submit,
  .btn-reset {
    width: 100%;
    text-align: center;
    min-height: 40px;
    padding: 0.65rem 1rem;
    font-size: 0.88rem;
  }

  .loading-state,
  .empty-state {
    padding: 1.5rem 0.75rem;
  }

  .empty-icon-block {
    width: 2.5rem;
    height: 2.5rem;
  }

  /* Dynamic tables → stacked mobile cards (label above field) */
  .dynamic-table-wrapper {
    overflow: hidden !important;
    width: 100%;
  }

  .dynamic-table thead {
    display: none;
  }

  .dynamic-table,
  .dynamic-table tbody,
  .dynamic-table tfoot,
  .dynamic-table tr,
  .dynamic-table td {
    display: block;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
  }

  .dynamic-table tbody tr {
    position: relative;
    margin-bottom: 0.5rem;
    padding: 0.55rem 0.6rem;
    border-radius: 10px;
    border: 1px solid rgba(167, 211, 178, 0.35);
    background: rgba(0, 0, 0, 0.12);
  }

  .dynamic-table tbody tr.has-remove {
    padding-top: 2.4rem;
  }

  .page-container.light-theme .dynamic-table tbody tr {
    background: #f8fdf9;
    border-color: #bbf7d0;
  }

  .dynamic-table td.dt-actions-cell {
    position: absolute;
    top: 0.45rem;
    right: 0.45rem;
    left: auto;
    width: auto !important;
    max-width: none;
    padding: 0 !important;
    margin: 0;
    border: none !important;
    z-index: 2;
  }

  .dynamic-table td.dt-actions-cell:empty {
    display: none !important;
  }

  .dynamic-table td.dt-actions-cell .remove-btn {
    width: 34px;
    height: 34px;
    min-width: 34px;
    min-height: 34px;
    font-size: 1.2rem;
  }

  .dynamic-table tbody td {
    padding: 0 0 0.4rem;
    border-bottom: none;
  }

  .dynamic-table tbody td:last-child {
    padding-bottom: 0;
  }

  .dt-label {
    display: block;
    margin-bottom: 0.15rem;
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    line-height: 1.2;
    color: rgba(229, 235, 231, 0.65);
  }

  .page-container.light-theme .dt-label {
    color: #64748b;
  }

  .dynamic-table td input,
  .dynamic-table td select {
    display: block;
    width: 100% !important;
    max-width: 100%;
    min-width: 0;
    min-height: 44px;
    padding: 0.5rem 0.55rem;
    font-size: 16px;
    box-sizing: border-box;
  }

  .dynamic-table td.computed-cell {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem;
    min-width: 0;
    padding: 0.35rem 0 0;
    border-top: 1px solid rgba(190, 235, 203, 0.18);
  }

  .page-container.light-theme .dynamic-table td.computed-cell {
    border-top-color: #e2e8f0;
  }

  .dynamic-table td.computed-cell .dt-label {
    margin-bottom: 0;
  }

  .dt-value {
    font-size: 0.9rem;
    font-weight: 700;
    white-space: nowrap;
  }

  .dynamic-table tfoot tr {
    display: flex;
    flex-wrap: nowrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.35rem 0.1rem 0;
    margin: 0;
    border: none;
  }

  .dynamic-table tfoot td {
    display: block;
    width: auto;
    border: none;
    padding: 0 !important;
  }

  .dynamic-table tfoot .total-label {
    text-align: left;
    font-size: 0.78rem;
    min-width: 0;
  }

  .dynamic-table tfoot .total-value {
    font-size: 0.9rem;
    padding: 0 !important;
  }

  .dynamic-table tfoot td:empty,
  .dynamic-table tfoot td:last-child:not(.total-value) {
    display: none;
  }

  .edit-banner {
    flex-direction: column;
    align-items: stretch;
    gap: 0.45rem;
    padding: 0.65rem 0.75rem;
    font-size: 0.82rem;
  }

  .cancel-edit-btn {
    width: 100%;
    min-height: 36px;
  }
}

@media (max-width: 480px) {
  .page-container.farmer-income-page {
    padding: 0.55rem 0.45rem 1.1rem;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .tab-nav {
    grid-template-columns: 1fr 1fr;
    gap: 0.4rem;
  }

  .page-title {
    font-size: 1.08rem !important;
  }

  .record-financials {
    grid-template-columns: 1fr !important;
  }

  .financial-value {
    font-size: 0.88rem;
  }
}

/* View Button */
.view-btn {
  padding: 0.42rem 0.92rem;
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.86rem;
  font-weight: 700;
  transition: background 0.2s, border-color 0.2s;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid rgba(134, 239, 172, 0.35);
  box-shadow: none;
  filter: none;
}
.view-btn:hover {
  background: rgba(255, 255, 255, 0.14);
  transform: translateY(-1px);
}
.record-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.edit-btn {
  padding: 0.42rem 0.92rem;
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.86rem;
  font-weight: 700;
  transition: background 0.2s, border-color 0.2s;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid rgba(126, 184, 145, 0.35);
  box-shadow: none;
  filter: none;
}
.edit-btn:hover {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(134, 239, 172, 0.45);
  transform: translateY(-1px);
}

/* Strong readability overrides for history cards in dark theme */
.page-container:not(.light-theme) .record-card :is(
  .record-date,
  .detail-label,
  .detail-value,
  .financial-label,
  .financial-value
) {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.edit-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 10px;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #92400e;
}
.cancel-edit-btn {
  padding: 0.3rem 0.75rem;
  background: #fff;
  color: #92400e;
  border: 1px solid #fbbf24;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  transition: all 0.2s;
}
.cancel-edit-btn:hover {
  background: #fef3c7;
}

/* Modal Overlay — geometry shared; colors via theme classes */
.modal-overlay {
  position: fixed !important;
  inset: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  z-index: 10050 !important;
  padding:
    max(0.75rem, env(safe-area-inset-top, 0px))
    max(0.75rem, env(safe-area-inset-right, 0px))
    max(0.75rem, env(safe-area-inset-bottom, 0px))
    max(0.75rem, env(safe-area-inset-left, 0px));
  background: rgba(6, 12, 9, 0.62);
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
  box-sizing: border-box;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.modal-container {
  background: #fff;
  border-radius: 14px;
  width: 100%;
  max-width: 720px;
  max-height: min(92dvh, calc(100dvh - 1.5rem));
  margin: auto;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45);
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid rgba(190, 235, 203, 0.14);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  background: #166534;
  color: #f0fdf4;
  border-bottom: 1px solid rgba(134, 239, 172, 0.25);
}
.modal-header h2 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
}
.modal-close {
  background: rgba(255,255,255,0.2);
  border: none;
  color: white;
  font-size: 1.5rem;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.modal-close:hover {
  background: rgba(255,255,255,0.35);
}
.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
.detail-table-wrap {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
}
.btn-close-modal {
  padding: 0.55rem 1.5rem;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.2s;
}
.btn-close-modal:hover {
  background: #e5e7eb;
}

/* Detail Sections */
.detail-section {
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #f3f4f6;
}
.detail-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}
.detail-section-title {
  font-size: 1rem;
  font-weight: 700;
  color: #166534;
  margin: 0 0 0.75rem 0;
}
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
.detail-cell {
  background: #f9fafb;
  border-radius: 8px;
  padding: 0.6rem 0.8rem;
}
.cell-label {
  display: block;
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 600;
  margin-bottom: 0.15rem;
}
.cell-value {
  display: block;
  font-size: 0.95rem;
  font-weight: 600;
  color: #1f2937;
}

/* Detail Tables */
.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}
.detail-table th {
  background: #f0fdf4;
  color: #166534;
  font-weight: 600;
  padding: 0.5rem 0.6rem;
  text-align: left;
  border-bottom: 2px solid #bbf7d0;
}
.detail-table td {
  padding: 0.45rem 0.6rem;
  border-bottom: 1px solid #f3f4f6;
}
.detail-table .amt {
  font-weight: 600;
  color: #166534;
}
.detail-table .foot-label {
  text-align: right;
  font-weight: 700;
  color: #374151;
  padding-top: 0.6rem;
}
.detail-table .foot-value {
  font-weight: 700;
  color: #166534;
  padding-top: 0.6rem;
}
.no-data {
  color: #9ca3af;
  font-style: italic;
  font-size: 0.85rem;
  margin: 0;
}

/* Expense Grid */
.expense-grid {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.expense-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.4rem 0.75rem;
  background: #f9fafb;
  border-radius: 6px;
  font-size: 0.85rem;
}
.expense-row.total-row {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  font-weight: 700;
  color: #166534;
  margin-top: 0.35rem;
}

/* Grand Summary */
.summary-detail-section {
  background: #f0fdf4;
  border-radius: 10px;
  padding: 1rem;
  border: 1px solid #86efac;
}
.grand-summary {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.grand-row {
  display: flex;
  justify-content: space-between;
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
}
.income-row {
  background: #eff6ff;
  color: #2563eb;
}
.expense-summary-row {
  background: #fef2f2;
  color: #dc2626;
}
.net-profit-row {
  background: #dcfce7;
  color: #166534;
  font-size: 1.05rem;
}
.net-loss-row {
  background: #fee2e2;
  color: #dc2626;
  font-size: 1.05rem;
}

/* Assistance Tab Styles */
.assistance-wrapper {
  width: 100%;
}

/* Summary Section */
.assistance-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #ecfdf5;
  border-radius: 12px;
  border: 1px solid #86efac;
}

.summary-box {
  background: white;
  border-radius: 10px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  border: 1px solid #e5e7eb;
}

.summary-box:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  border-color: #86efac;
}

.summary-icon {
  font-size: 2rem;
  min-width: 50px;
  text-align: center;
}

.summary-info {
  flex: 1;
}

.summary-label {
  display: block;
  font-size: 0.8rem;
  color: #6b7280;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.4rem;
}

.summary-value {
  display: block;
  font-size: 1.75rem;
  font-weight: 700;
  color: #166534;
}

/* Assistance Grid */
.assistance-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 0.7rem;
  margin-top: 0.75rem;
}

.assistance-card {
  background: white;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
  border: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
}

.assistance-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  border-color: #86efac;
}

.assistance-card .card-header {
  padding: 0.45rem 0.65rem;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.4rem;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex: 1;
  min-width: 0;
}

.assistance-type-badge {
  display: inline-block;
  padding: 0.18rem 0.5rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  white-space: nowrap;
  line-height: 1.3;
}

.assistance-type-badge.type-fertilizer {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fcd34d;
}

.assistance-type-badge.type-seeds {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.assistance-type-badge.type-both {
  background: #e0e7ff;
  color: #3730a3;
  border: 1px solid #c7d2fe;
}

.status-badge {
  display: inline-block;
  padding: 0.16rem 0.5rem;
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 700;
  white-space: nowrap;
  line-height: 1.3;
}

.status-badge.completed {
  background: #bbf7d0;
  color: #14532d;
  border: 1px solid #4ade80;
}

.status-badge.pending {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fcd34d;
}

.status-badge.eligible {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #86efac;
}

.status-badge.rejected {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fca5a5;
}

.page-container:not(.light-theme) .status-badge.pending {
  background: rgba(146, 64, 14, 0.5);
  color: #fde68a;
  border-color: rgba(250, 204, 21, 0.45);
}

.page-container:not(.light-theme) .status-badge.eligible {
  background: rgba(22, 101, 52, 0.45);
  color: #bbf7d0;
  border-color: rgba(74, 222, 128, 0.45);
}

.page-container:not(.light-theme) .status-badge.rejected {
  background: rgba(127, 29, 29, 0.5);
  color: #fecaca;
  border-color: rgba(248, 113, 113, 0.45);
}

.page-container.farmer-income-page:not(.light-theme) .status-badge.completed,
.page-container.farmer-income-page:not(.light-theme) .assistance-card .status-badge.completed {
  background: #166534 !important;
  color: #f7fee7 !important;
  -webkit-text-fill-color: #f7fee7 !important;
  border: 1px solid #4ade80 !important;
}

.assistance-card .card-body {
  padding: 0.55rem 0.7rem 0.45rem;
  flex: 1;
}

.info-row {
  margin-bottom: 0.4rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.45rem;
}

.info-row.dates-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.3rem;
  margin-bottom: 0.35rem;
  padding-top: 0.4rem;
  border-top: 1px solid #f3f4f6;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  min-width: 0;
}

.info-label {
  font-size: 0.62rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.info-value {
  font-size: 0.78rem;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.3;
}

.quantity-highlight {
  font-size: 0.78rem;
  color: #16a34a;
  font-weight: 700;
}

.notes-section {
  background: #f9fafb;
  border-left: 3px solid #16a34a;
  padding: 0.4rem 0.5rem;
  border-radius: 6px;
  margin-top: 0.35rem;
}

.notes-label {
  display: block;
  font-size: 0.62rem;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-bottom: 0.2rem;
}

.notes-content {
  font-size: 0.75rem;
  color: #374151;
  margin: 0;
  line-height: 1.35;
}

.assistance-card .card-footer {
  padding: 0.3rem 0.65rem;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: center;
}

.badge-info {
  font-size: 0.62rem;
  font-weight: 600;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.16rem 0.5rem;
  border-radius: 999px;
  white-space: nowrap;
}

/* Darker cards/panels override for Farmer Income page */
.page-container:not(.light-theme) .form-section,
.page-container:not(.light-theme) .summary-section,
.page-container:not(.light-theme) .record-card,
.page-container:not(.light-theme) .assistance-summary,
.page-container:not(.light-theme) .assistance-card,
.page-container:not(.light-theme) .summary-box,
.page-container:not(.light-theme) .modal-container {
  background: rgba(26, 44, 35, 0.97) !important;
  border: 1px solid rgba(167, 243, 208, 0.32) !important;
  box-shadow: 0 10px 22px rgba(6, 12, 9, 0.34) !important;
}

.page-container:not(.light-theme) .detail-cell,
.page-container:not(.light-theme) .summary-item,
.page-container:not(.light-theme) .notes-section,
.page-container:not(.light-theme) .expense-row,
.page-container:not(.light-theme) .assistance-card .card-footer,
.page-container:not(.light-theme) .assistance-card .card-header {
  background: rgba(42, 64, 50, 0.78) !important;
  border-color: rgba(167, 243, 208, 0.28) !important;
}

.page-container:not(.light-theme) .dynamic-table th,
.page-container:not(.light-theme) .detail-table th {
  background: rgba(20, 83, 45, 0.72) !important;
  color: #ecfdf5 !important;
  border-bottom: 2px solid rgba(74, 222, 128, 0.35) !important;
}

.page-container:not(.light-theme) .dynamic-table td,
.page-container:not(.light-theme) .detail-table td,
.page-container:not(.light-theme) .notes-content,
.page-container:not(.light-theme) .info-value,
.page-container:not(.light-theme) .cell-value,
.page-container:not(.light-theme) .detail-value {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.page-container:not(.light-theme) .form-section,
.page-container:not(.light-theme) .form-section label,
.page-container:not(.light-theme) .section-title,
.page-container:not(.light-theme) .dynamic-table th,
.page-container:not(.light-theme) .dynamic-table td,
.page-container:not(.light-theme) .computed-cell,
.page-container:not(.light-theme) .total-label,
.page-container:not(.light-theme) .total-value,
.page-container:not(.light-theme) .labor-total-label,
.page-container:not(.light-theme) .labor-total-value,
.page-container:not(.light-theme) .summary-item .summary-label,
.page-container:not(.light-theme) .summary-item .summary-value,
.page-container:not(.light-theme) .summary-label,
.page-container:not(.light-theme) .summary-value,
.page-container:not(.light-theme) .form-group input,
.page-container:not(.light-theme) .form-group select {
  color: #ffffff !important;
}

.page-container:not(.light-theme) .form-group input::placeholder {
  color: rgba(220, 252, 231, 0.5) !important;
}

/* Form fields: dark wells — iwas light-on-light (puting text sa maliwanag na bg) */
.page-container:not(.light-theme) .form-group input,
.page-container:not(.light-theme) .form-group select {
  background: rgba(6, 18, 12, 0.55) !important;
  border-color: rgba(126, 184, 145, 0.42) !important;
  color: #ecfdf5 !important;
}

.page-container:not(.light-theme) .form-group select option {
  background: #142e22;
  color: #ecfdf5;
}

.page-container:not(.light-theme) .dynamic-table td input,
.page-container:not(.light-theme) .dynamic-table td select {
  background: rgba(6, 18, 12, 0.5) !important;
  border-color: rgba(126, 184, 145, 0.38) !important;
  color: #ecfdf5 !important;
}

.page-container:not(.light-theme) .dynamic-table td select option {
  background: #142e22;
  color: #ecfdf5;
}

/* Chrome/Edge: hindi madilaw ang numero sa madilim na field (+ autofill) */
.page-container:not(.light-theme) .form-group input,
.page-container:not(.light-theme) .form-group select,
.page-container:not(.light-theme) .dynamic-table td input,
.page-container:not(.light-theme) .dynamic-table td select {
  color-scheme: dark;
  caret-color: #bbf7d0;
  -webkit-text-fill-color: #f0fdf4 !important;
}

.page-container:not(.light-theme) .form-group input::placeholder,
.page-container:not(.light-theme) .dynamic-table td input::placeholder {
  opacity: 1;
  color: rgba(220, 252, 231, 0.7) !important;
  -webkit-text-fill-color: rgba(220, 252, 231, 0.7) !important;
}

.page-container:not(.light-theme) .form-group input:disabled {
  opacity: 0.95;
  -webkit-text-fill-color: rgba(220, 252, 231, 0.75) !important;
  color: rgba(220, 252, 231, 0.75) !important;
}

.page-container:not(.light-theme) .form-group input:-webkit-autofill,
.page-container:not(.light-theme) .form-group input:-webkit-autofill:hover,
.page-container:not(.light-theme) .form-group input:-webkit-autofill:focus,
.page-container:not(.light-theme) .dynamic-table td input:-webkit-autofill,
.page-container:not(.light-theme) .dynamic-table td input:-webkit-autofill:focus {
  -webkit-text-fill-color: #f0fdf4 !important;
  caret-color: #bbf7d0;
  transition: background-color 99999s ease-out 0s;
  box-shadow: 0 0 0 1000px rgba(6, 18, 12, 0.92) inset !important;
}

/* Mas malinaw na hierarchy: hindi lahat sapilitang puti */
.page-container:not(.light-theme) .section-title {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  border-bottom-color: rgba(134, 239, 172, 0.35) !important;
}

.page-container:not(.light-theme) .form-section label {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.page-container:not(.light-theme) .summary-section .summary-item .summary-label {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-size: 0.72rem;
}

.page-container:not(.light-theme) .summary-item .summary-label {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.page-container:not(.light-theme) .summary-item.income .summary-value,
.page-container:not(.light-theme) .summary-item.expense .summary-value,
.page-container:not(.light-theme) .summary-item.profit .summary-value,
.page-container:not(.light-theme) .summary-item.loss .summary-value {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.page-container:not(.light-theme) .remove-btn {
  background: rgba(127, 29, 29, 0.42) !important;
  color: #fecaca !important;
  -webkit-text-fill-color: #fecaca !important;
  border: 1px solid rgba(248, 113, 113, 0.5) !important;
  box-shadow: none !important;
}

.page-container:not(.light-theme) .remove-btn:hover {
  background: #dc2626 !important;
  border-color: #f87171 !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

/* Assistance: labels at badge na dating abo sa madilim na card */
.page-container:not(.light-theme) .assistance-card .info-label,
.page-container:not(.light-theme) .assistance-card .notes-label {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.page-container:not(.light-theme) .assistance-card .quantity-highlight {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.page-container:not(.light-theme) .assistance-card .badge-info {
  background: rgba(0, 0, 0, 0.28) !important;
  color: rgba(220, 252, 231, 0.9) !important;
}

.page-container:not(.light-theme) .info-row.dates-row {
  border-top-color: rgba(255, 255, 255, 0.1) !important;
}

.page-container:not(.light-theme) .modal-footer {
  border-top: 1px solid rgba(126, 184, 145, 0.2) !important;
  background: rgba(14, 24, 19, 0.85) !important;
}

.page-container:not(.light-theme) .tab-btn {
  background: rgba(255, 255, 255, 0.08) !important;
  border-color: rgba(190, 235, 203, 0.28) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  box-shadow: none !important;
  filter: none !important;
}

.page-container:not(.light-theme) .tab-btn:hover:not(.active) {
  background: rgba(255, 255, 255, 0.12) !important;
}

.page-container:not(.light-theme) .tab-btn.active {
  background: rgba(255, 255, 255, 0.14) !important;
  border-color: rgba(134, 239, 172, 0.45) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.page-container:not(.light-theme) input[type='file'] {
  color: rgba(236, 253, 245, 0.92);
  font-size: 0.875rem;
}

.page-container:not(.light-theme) input[type='file']::file-selector-button {
  margin-right: 0.75rem;
  padding: 0.45rem 0.85rem;
  border-radius: 8px;
  border: 1px solid rgba(126, 184, 145, 0.45);
  background: rgba(22, 101, 52, 0.55);
  color: #ecfdf5;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.8rem;
}

.page-container:not(.light-theme) .foundation-summary {
  background: rgba(0, 0, 0, 0.28) !important;
  border-color: rgba(126, 184, 145, 0.35) !important;
  color: rgba(236, 253, 245, 0.92) !important;
}

.page-container:not(.light-theme) .model-info-box {
  background: rgba(74, 222, 128, 0.1) !important;
  border-color: rgba(126, 184, 145, 0.32) !important;
}

/* Detail modal Teleport — hindi nasa ilalim ng .page-container sa DOM */
.farmer-income-page-modal:not(.light-theme).modal-overlay {
  background: rgba(6, 12, 9, 0.62);
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
}

.farmer-income-page-modal:not(.light-theme) .modal-container {
  background: rgba(24, 40, 32, 0.99) !important;
  border: 1px solid rgba(167, 243, 208, 0.35) !important;
  box-shadow: 0 24px 56px rgba(0, 0, 0, 0.45) !important;
}

.farmer-income-page-modal:not(.light-theme) .modal-header h2 {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.farmer-income-page-modal:not(.light-theme) .modal-body {
  color: #ffffff;
}

.farmer-income-page-modal:not(.light-theme) .detail-section-title {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.farmer-income-page-modal:not(.light-theme) .detail-cell {
  background: rgba(0, 0, 0, 0.28) !important;
  border: 1px solid rgba(134, 239, 172, 0.15);
}

.farmer-income-page-modal:not(.light-theme) .cell-label {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  opacity: 0.85;
}

.farmer-income-page-modal:not(.light-theme) .cell-value {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.farmer-income-page-modal:not(.light-theme) .detail-table th {
  background: rgba(20, 83, 45, 0.75) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  border-bottom: 2px solid rgba(74, 222, 128, 0.32) !important;
}

.farmer-income-page-modal:not(.light-theme) .detail-table td,
.farmer-income-page-modal:not(.light-theme) .detail-table .amt,
.farmer-income-page-modal:not(.light-theme) .detail-table .foot-label,
.farmer-income-page-modal:not(.light-theme) .detail-table .foot-value {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

.farmer-income-page-modal:not(.light-theme) .no-data {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  opacity: 0.85;
}

.farmer-income-page-modal:not(.light-theme) .detail-section {
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

.farmer-income-page-modal:not(.light-theme) .expense-row,
.farmer-income-page-modal:not(.light-theme) .expense-row.total-row {
  background: rgba(0, 0, 0, 0.28) !important;
  border: 1px solid rgba(134, 239, 172, 0.12);
  color: #ffffff !important;
}

.farmer-income-page-modal:not(.light-theme) .expense-row span {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.farmer-income-page-modal:not(.light-theme) .summary-detail-section {
  background: rgba(0, 0, 0, 0.22) !important;
  border-color: rgba(126, 184, 145, 0.35) !important;
}

.farmer-income-page-modal:not(.light-theme) .income-row,
.farmer-income-page-modal:not(.light-theme) .expense-summary-row,
.farmer-income-page-modal:not(.light-theme) .net-profit-row,
.farmer-income-page-modal:not(.light-theme) .net-loss-row {
  background: rgba(0, 0, 0, 0.28) !important;
  border: 1px solid rgba(134, 239, 172, 0.12);
  color: #ffffff !important;
}

.farmer-income-page-modal:not(.light-theme) .grand-row span {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.farmer-income-page-modal:not(.light-theme) .modal-footer {
  border-top: 1px solid rgba(126, 184, 145, 0.22) !important;
  background: rgba(14, 24, 19, 0.9) !important;
}

.farmer-income-page-modal:not(.light-theme) .btn-close-modal {
  background: rgba(255, 255, 255, 0.08) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  border: 1px solid rgba(190, 235, 203, 0.28) !important;
  box-shadow: none !important;
  filter: none !important;
}

.farmer-income-page-modal:not(.light-theme) .btn-close-modal:hover {
  background: rgba(255, 255, 255, 0.14) !important;
  box-shadow: none !important;
  filter: none !important;
}

/* ===== LIGHT MODE — colors only (layout matches dark) ===== */
.page-container.farmer-income-page.light-theme .page-header-split {
  background: #ffffff !important;
  border-color: #86efac !important;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1) !important;
}

.page-container.farmer-income-page.light-theme .page-header-split::before {
  background: radial-gradient(circle, rgba(74, 222, 128, 0.14) 0%, transparent 68%);
}

.page-container.farmer-income-page.light-theme .page-header-split::after {
  background: linear-gradient(90deg, rgba(22, 101, 52, 0.35), rgba(134, 239, 172, 0.12));
}

.page-container.farmer-income-page.light-theme .page-title {
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
  background: none !important;
}

.page-container.farmer-income-page.light-theme .page-subtitle {
  color: #14532d !important;
  -webkit-text-fill-color: #14532d !important;
}

.page-container.farmer-income-page.light-theme .tab-btn {
  background: #ffffff !important;
  border: 1px solid #86efac !important;
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
  box-shadow: 0 4px 14px rgba(22, 101, 52, 0.08) !important;
}

.page-container.farmer-income-page.light-theme .tab-btn.active,
.page-container.farmer-income-page.light-theme .tab-btn:hover:not(.active) {
  background: #f0fdf4 !important;
  border-color: #16a34a !important;
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
  box-shadow: 0 4px 14px rgba(22, 101, 52, 0.1) !important;
}

.page-container.farmer-income-page.light-theme .card-sub {
  color: #14532d !important;
  -webkit-text-fill-color: #14532d !important;
}

.page-container.farmer-income-page.light-theme :is(
  .form-section,
  .summary-section,
  .record-card,
  .assistance-summary,
  .assistance-card,
  .summary-box,
  .empty-state
) {
  background: #ffffff !important;
  border-color: #86efac !important;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1) !important;
}

.page-container.farmer-income-page.light-theme :is(
  .detail-cell,
  .summary-item,
  .notes-section,
  .expense-row,
  .financial-item,
  .assistance-card .card-footer,
  .assistance-card .card-header,
  .labor-total-box,
  .foundation-summary,
  .model-info-box
) {
  background: #f8fdf9 !important;
  border-color: #bbf7d0 !important;
}

.page-container.farmer-income-page.light-theme .record-header {
  border-bottom-color: #bbf7d0 !important;
}

.page-container.farmer-income-page.light-theme .record-financials,
.page-container.farmer-income-page.light-theme .record-actions {
  border-top-color: #bbf7d0 !important;
}

.page-container.farmer-income-page.light-theme .section-title {
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
  border-bottom-color: #bbf7d0 !important;
}

.page-container.farmer-income-page.light-theme .dynamic-table th,
.page-container.farmer-income-page.light-theme .detail-table th {
  background: #f0fdf4 !important;
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
  border-bottom-color: #86efac !important;
}

.page-container.farmer-income-page.light-theme .dynamic-table td,
.page-container.farmer-income-page.light-theme .detail-table td {
  border-bottom-color: #e2e8f0 !important;
}

.page-container.farmer-income-page.light-theme .remove-btn {
  background: #fef2f2 !important;
  color: #dc2626 !important;
  -webkit-text-fill-color: #dc2626 !important;
  border: 1px solid #fca5a5 !important;
  box-shadow: none !important;
}

.page-container.farmer-income-page.light-theme .remove-btn:hover {
  background: #dc2626 !important;
  border-color: #b91c1c !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.page-container.farmer-income-page.light-theme .view-btn,
.page-container.farmer-income-page.light-theme .edit-btn {
  background: #ffffff !important;
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
  border: 1px solid #86efac !important;
}

.page-container.farmer-income-page.light-theme :is(
  .section-title,
  .form-section label,
  .form-group label,
  .dynamic-table td,
  .detail-table td,
  .notes-content,
  .info-value,
  .cell-value,
  .computed-cell,
  .total-label,
  .total-value,
  .labor-total-label,
  .labor-total-value,
  .summary-label,
  .summary-value,
  .record-date,
  .detail-label,
  .detail-value,
  .financial-label,
  .assistance-card .info-label,
  .assistance-card .notes-label,
  .loading-state,
  .empty-state,
  .edit-banner,
  .add-row-btn,
  .btn-reset,
  .form-section p,
  .income-form,
  .history-wrapper,
  .assistance-wrapper
) {
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
}

.page-container.farmer-income-page.light-theme .financial-item.income .financial-value {
  color: #2563eb !important;
  -webkit-text-fill-color: #2563eb !important;
}

.page-container.farmer-income-page.light-theme .financial-item.expense .financial-value {
  color: #dc2626 !important;
  -webkit-text-fill-color: #dc2626 !important;
}

.page-container.farmer-income-page.light-theme .financial-item.profit .financial-value {
  color: #166534 !important;
  -webkit-text-fill-color: #166534 !important;
}

.page-container.farmer-income-page.light-theme .financial-item.loss .financial-value {
  color: #dc2626 !important;
  -webkit-text-fill-color: #dc2626 !important;
}

.page-container.farmer-income-page.light-theme :is(
  .form-group input,
  .form-group select,
  .dynamic-table td input,
  .dynamic-table td select
) {
  background: #ffffff !important;
  border: 1px solid #94a3b8 !important;
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
  color-scheme: light;
  caret-color: #052e16;
}

.page-container.farmer-income-page.light-theme .form-group select option,
.page-container.farmer-income-page.light-theme .dynamic-table td select option {
  background: #ffffff !important;
  color: #052e16 !important;
}

.page-container.farmer-income-page.light-theme .form-group input::placeholder,
.page-container.farmer-income-page.light-theme .dynamic-table td input::placeholder {
  color: #64748b !important;
  -webkit-text-fill-color: #64748b !important;
}

.page-container.farmer-income-page.light-theme .form-group input:-webkit-autofill,
.page-container.farmer-income-page.light-theme .form-group input:-webkit-autofill:focus,
.page-container.farmer-income-page.light-theme .dynamic-table td input:-webkit-autofill,
.page-container.farmer-income-page.light-theme .dynamic-table td input:-webkit-autofill:focus {
  -webkit-text-fill-color: #052e16 !important;
  box-shadow: 0 0 0 1000px #ffffff inset !important;
}

.page-container.farmer-income-page.light-theme .labor-total-box {
  background: #f0fdf4 !important;
  border-color: #86efac !important;
}

.page-container.farmer-income-page.light-theme .labor-total-label,
.page-container.farmer-income-page.light-theme .labor-total-value {
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
}

.page-container.farmer-income-page.light-theme .summary-item .summary-label {
  color: #14532d !important;
  -webkit-text-fill-color: #14532d !important;
}

.page-container.farmer-income-page.light-theme .add-row-btn {
  color: #166534 !important;
  -webkit-text-fill-color: #166534 !important;
  border: 1px dashed #86efac !important;
  background: #f0fdf4 !important;
}

.page-container.farmer-income-page.light-theme .foundation-summary,
.page-container.farmer-income-page.light-theme .model-info-box {
  background: #f8fdf9 !important;
  border-color: #bbf7d0 !important;
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
}

.page-container.farmer-income-page.light-theme .model-info-box strong {
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
}

.page-container.farmer-income-page.light-theme .forecast-history-table th,
.page-container.farmer-income-page.light-theme .forecast-history-table td {
  border-bottom-color: #d1fae5 !important;
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
}

.page-container.farmer-income-page.light-theme .assistance-card .quantity-highlight {
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
}

.page-container.farmer-income-page.light-theme .assistance-card .status-badge.completed {
  background: #bbf7d0 !important;
  color: #14532d !important;
  -webkit-text-fill-color: #14532d !important;
  border: 1px solid #22c55e !important;
}

.page-container.farmer-income-page.light-theme .assistance-card .badge-info {
  background: #f3f4f6 !important;
  color: #334155 !important;
  -webkit-text-fill-color: #334155 !important;
}

.page-container.farmer-income-page.light-theme .empty-state {
  background: #ffffff !important;
  border-color: #86efac !important;
  color: #166534 !important;
  -webkit-text-fill-color: #166534 !important;
}

.page-container.farmer-income-page.light-theme input[type='file'] {
  color: #052e16;
}

.page-container.farmer-income-page.light-theme input[type='file']::file-selector-button {
  background: #ffffff !important;
  border: 1px solid #86efac !important;
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
}

.farmer-income-page-modal.light-theme.modal-overlay {
  background: rgba(15, 23, 42, 0.4) !important;
}

.farmer-income-page-modal.light-theme .modal-container {
  background: #fffef9 !important;
  border-color: #86efac !important;
  box-shadow: 0 24px 48px rgba(22, 101, 52, 0.18) !important;
}

.farmer-income-page-modal.light-theme .modal-header {
  background: #166534 !important;
  color: #f0fdf4 !important;
}

.farmer-income-page-modal.light-theme .modal-body,
.farmer-income-page-modal.light-theme .cell-value,
.farmer-income-page-modal.light-theme .detail-table td,
.farmer-income-page-modal.light-theme .modal-header h2 {
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
}

.farmer-income-page-modal.light-theme .modal-header h2 {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.farmer-income-page-modal.light-theme .detail-section-title {
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
}

.farmer-income-page-modal.light-theme .cell-label,
.farmer-income-page-modal.light-theme .no-data {
  color: #166534 !important;
  -webkit-text-fill-color: #166534 !important;
}

.farmer-income-page-modal.light-theme .detail-table th {
  background: #f0fdf4 !important;
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
  border-bottom-color: #86efac !important;
}

.farmer-income-page-modal.light-theme .detail-table td {
  border-bottom-color: #e2e8f0 !important;
}

.farmer-income-page-modal.light-theme .detail-cell {
  background: #f8fdf9 !important;
  border-color: #bbf7d0 !important;
}

.farmer-income-page-modal.light-theme .summary-detail-section {
  background: #f0fdf4 !important;
  border-color: #bbf7d0 !important;
}

.farmer-income-page-modal.light-theme .modal-footer {
  background: #f8fafc !important;
  border-top-color: #e2e8f0 !important;
}

.farmer-income-page-modal.light-theme .btn-close-modal {
  background: #ffffff !important;
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
  border: 1px solid #86efac !important;
}

.farmer-income-page-modal.light-theme .expense-row,
.farmer-income-page-modal.light-theme .grand-row {
  background: #f8fdf9 !important;
  border-color: #bbf7d0 !important;
}

.farmer-income-page-modal.light-theme .expense-row span,
.farmer-income-page-modal.light-theme .grand-row span {
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
  background: transparent !important;
  border: none !important;
}

.farmer-income-page-modal.light-theme .detail-section {
  border-bottom-color: #e2e8f0 !important;
}

@media (max-width: 600px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
  .modal-container {
    max-height: min(94dvh, calc(100dvh - 1rem));
  }
  .assistance-summary {
    grid-template-columns: repeat(2, 1fr);
    padding: 1rem;
    gap: 0.75rem;
  }
  .assistance-grid {
    grid-template-columns: 1fr;
  }
  .info-row {
    grid-template-columns: 1fr;
  }
  .summary-box {
    padding: 1rem;
    flex-direction: column;
    text-align: center;
  }
  .summary-icon {
    font-size: 1.75rem;
    min-width: auto;
  }
  .summary-value {
    font-size: 1.5rem;
  }
}
</style>

<style>
/* Teleported alerts + modal chrome (outside scoped page tree) */
.alert-center-stack.farmer-income-alerts {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10060;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  pointer-events: none;
  width: min(420px, calc(100vw - 1.5rem));
}

.alert-center-stack.farmer-income-alerts .alert {
  pointer-events: auto;
  margin: 0;
}

.farmer-income-page-modal.modal-overlay {
  position: fixed !important;
  inset: 0 !important;
  z-index: 10050 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding:
    max(0.75rem, env(safe-area-inset-top, 0px))
    max(0.75rem, env(safe-area-inset-right, 0px))
    max(0.75rem, env(safe-area-inset-bottom, 0px))
    max(0.75rem, env(safe-area-inset-left, 0px)) !important;
  background: rgba(6, 12, 9, 0.62) !important;
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
  box-sizing: border-box;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.farmer-income-page-modal.light-theme.modal-overlay {
  background: rgba(15, 23, 42, 0.4) !important;
}

@media (max-width: 768px) {
  .farmer-income-page-modal .modal-container {
    max-width: 100%;
    max-height: min(92dvh, calc(100dvh - 1rem));
  }

  .farmer-income-page-modal .modal-header {
    padding: 0.85rem 1rem;
  }

  .farmer-income-page-modal .modal-header h2 {
    font-size: 1rem;
  }

  .farmer-income-page-modal .modal-body {
    padding: 0.85rem 1rem;
  }

  .farmer-income-page-modal .detail-table-wrap,
  .farmer-income-page-modal .detail-table {
    display: block;
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
}

.farmer-income-page-modal {
  font-size: 16px;
  line-height: 1.5;
}

@media (min-width: 769px) {
  html body .page-container.farmer-income-page.machinery-ui {
    padding: 12px 16px !important;
    margin: 0 !important;
    width: 100% !important;
    max-width: none !important;
    font-size: 16px !important;
    line-height: 1.5 !important;
    border-radius: 14px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .page-header-split {
    margin-bottom: 10px !important;
    padding: 10px 14px !important;
    gap: 8px !important;
    border-radius: 12px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui h1.page-title,
  html body .page-container.farmer-income-page.machinery-ui .page-title {
    font-size: 1.25rem !important;
    line-height: 1.2 !important;
    margin: 0 0 2px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .page-subtitle {
    font-size: 0.75rem !important;
    line-height: 1.35 !important;
    margin: 0 !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .tab-nav {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 8px !important;
    margin-bottom: 12px !important;
    align-items: stretch !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .tab-btn {
    width: 100% !important;
    min-width: 0 !important;
    padding: 8px 10px !important;
    font-size: 12px !important;
    min-height: 36px !important;
    border-width: 1px !important;
    border-radius: 10px !important;
    font-weight: 700 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    text-align: center !important;
    white-space: normal !important;
    line-height: 1.2 !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .form-wrapper,
  html body .page-container.farmer-income-page.machinery-ui .predictive-wrapper {
    display: flex !important;
    flex-direction: column !important;
    gap: 6px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .edit-banner {
    flex-direction: row !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 10px !important;
    padding: 6px 10px !important;
    margin-bottom: 0 !important;
    font-size: 13px !important;
    border-width: 1px !important;
    border-radius: 10px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .income-form {
    display: flex !important;
    flex-direction: column !important;
    gap: 6px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .cancel-edit-btn {
    width: auto !important;
    flex-shrink: 0 !important;
    padding: 5px 12px !important;
    font-size: 12px !important;
    min-height: 28px !important;
    border-width: 1px !important;
    border-radius: 8px !important;
    font-weight: 600 !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .form-section {
    padding: 8px 10px !important;
    margin-bottom: 0 !important;
    border-radius: 10px !important;
    border-width: 1px !important;
    box-shadow: 0 4px 12px rgba(6, 12, 9, 0.22) !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .form-section:last-child {
    margin-bottom: 0 !important;
  }

  html body .page-container.farmer-income-page.machinery-ui h3.section-title,
  html body .page-container.farmer-income-page.machinery-ui .section-title {
    font-size: 0.95rem !important;
    margin: 0 0 4px !important;
    padding-bottom: 4px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .form-row {
    gap: 6px 8px !important;
    margin-bottom: 4px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .form-row:last-child {
    margin-bottom: 0 !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .farmer-income-page .form-group,
  html body .page-container.farmer-income-page.machinery-ui .form-group {
    gap: 2px !important;
    margin-bottom: 0 !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .form-group label {
    font-size: 12px !important;
    margin-bottom: 0 !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .dynamic-table-wrapper {
    margin: 0 !important;
  }

  html body .page-container.farmer-income-page.machinery-ui :is(
    .form-group input,
    .form-group select,
    .dynamic-table td input,
    .dynamic-table td select
  ) {
    padding: 6px 10px !important;
    font-size: 13px !important;
    min-height: 32px !important;
    height: 32px !important;
    border-width: 1px !important;
    border-radius: 8px !important;
    box-sizing: border-box !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .form-group input[type='file'] {
    height: auto !important;
    min-height: 32px !important;
    padding: 4px 8px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .dynamic-table {
    font-size: 12px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .dynamic-table th {
    padding: 4px 6px !important;
    font-size: 11px !important;
    border-bottom-width: 1px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .dynamic-table td {
    padding: 4px 6px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .dynamic-table tfoot td {
    padding-top: 4px !important;
    padding-bottom: 2px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui :is(.total-label, .total-value) {
    padding-top: 4px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .remove-btn {
    width: 28px !important;
    height: 28px !important;
    min-width: 28px !important;
    min-height: 28px !important;
    font-size: 1rem !important;
    border-width: 1px !important;
    border-radius: 8px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .add-row-btn {
    margin-top: 4px !important;
    margin-bottom: 0 !important;
    padding: 5px 10px !important;
    font-size: 12px !important;
    min-height: 32px !important;
    border-width: 1px !important;
    border-radius: 8px !important;
    font-weight: 600 !important;
    width: auto !important;
    display: inline-flex !important;
    align-items: center !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .labor-total-box {
    padding: 6px 10px !important;
    margin-top: 6px !important;
    border-width: 1px !important;
    border-radius: 8px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .labor-total-label {
    font-size: 13px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .labor-total-value {
    font-size: 1rem !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .summary-section {
    border-width: 1px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .summary-grid {
    gap: 8px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .summary-item {
    padding: 8px 10px !important;
    border-radius: 10px !important;
    border-width: 1px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .summary-item .summary-label {
    font-size: 10px !important;
    margin-bottom: 2px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .summary-item .summary-value {
    font-size: 0.95rem !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .form-actions {
    display: flex !important;
    flex-direction: row !important;
    flex-wrap: wrap !important;
    justify-content: flex-end !important;
    align-items: center !important;
    gap: 8px !important;
    margin-top: 4px !important;
    padding: 0 !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .form-wrapper > .form-section,
  html body .page-container.farmer-income-page.machinery-ui .assistance-wrapper > .form-section,
  html body .page-container.farmer-income-page.machinery-ui .history-wrapper + .form-section {
    margin-bottom: 0 !important;
  }

  html body .page-container.farmer-income-page.machinery-ui :is(.btn-submit, .btn-reset) {
    width: auto !important;
    min-width: 0 !important;
    flex: 0 0 auto !important;
    padding: 6px 14px !important;
    font-size: 13px !important;
    min-height: 32px !important;
    border-width: 1px !important;
    border-radius: 8px !important;
    font-weight: 600 !important;
    line-height: 1.25 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    white-space: nowrap !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .predictive-actions {
    display: flex !important;
    flex-direction: row !important;
    flex-wrap: wrap !important;
    align-items: center !important;
    gap: 8px !important;
    margin-top: 10px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .predictive-actions :is(.btn-submit, .btn-reset) {
    width: auto !important;
    flex: 0 0 auto !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .foundation-summary,
  html body .page-container.farmer-income-page.machinery-ui .model-info-box {
    padding: 8px 12px !important;
    margin-top: 10px !important;
    font-size: 12px !important;
    border-width: 1px !important;
    border-radius: 10px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .forecast-history-table {
    font-size: 12px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .forecast-history-table th,
  html body .page-container.farmer-income-page.machinery-ui .forecast-history-table td {
    padding: 6px 8px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .records-list {
    gap: 8px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .record-card {
    padding: 10px 12px !important;
    border-radius: 10px !important;
    border-width: 1px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .record-header {
    padding-bottom: 6px !important;
    margin-bottom: 6px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .record-date {
    font-size: 0.9rem !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .status-badge {
    padding: 2px 8px !important;
    font-size: 10px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .record-financials {
    gap: 6px !important;
    margin-top: 8px !important;
    padding-top: 8px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .financial-item {
    padding: 6px 4px !important;
    border-width: 1px !important;
    border-radius: 8px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .financial-label {
    font-size: 9px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .financial-value {
    font-size: 0.78rem !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .record-actions {
    display: flex !important;
    flex-direction: row !important;
    flex-wrap: nowrap !important;
    justify-content: flex-end !important;
    align-items: center !important;
    gap: 6px !important;
    width: 100% !important;
    margin-top: 8px !important;
    padding-top: 8px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui :is(.edit-btn, .view-btn) {
    flex: 0 0 auto !important;
    width: auto !important;
    min-width: 0 !important;
    padding: 6px 12px !important;
    font-size: 12px !important;
    min-height: 30px !important;
    border-width: 1px !important;
    border-radius: 8px !important;
    font-weight: 600 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    white-space: nowrap !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .assistance-grid {
    gap: 10px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .assistance-card {
    padding: 10px 12px !important;
    border-radius: 10px !important;
    border-width: 1px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .loading-state,
  html body .page-container.farmer-income-page.machinery-ui .empty-state {
    padding: 24px 12px !important;
    font-size: 13px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .spinner {
    width: 32px !important;
    height: 32px !important;
    border-width: 3px !important;
  }

  body.glass-dark .page-container.farmer-income-page.machinery-ui :is(.btn-submit, .btn-reset, .edit-btn, .view-btn, .add-row-btn, .cancel-edit-btn, .tab-btn),
  body.glass-light .page-container.farmer-income-page.machinery-ui :is(.btn-submit, .btn-reset, .edit-btn, .view-btn, .add-row-btn, .cancel-edit-btn, .tab-btn) {
    border-radius: 8px !important;
    font-weight: 600 !important;
  }

  body.glass-dark .page-container.farmer-income-page.machinery-ui .tab-btn,
  body.glass-light .page-container.farmer-income-page.machinery-ui .tab-btn {
    border-width: 1px !important;
  }

  .farmer-income-page-modal .modal-header {
    padding: 12px 16px !important;
  }

  .farmer-income-page-modal .modal-header h2 {
    font-size: 16px !important;
    margin: 0 !important;
  }

  .farmer-income-page-modal .modal-body {
    padding: 12px 16px !important;
  }

  .farmer-income-page-modal .modal-close {
    width: 32px !important;
    height: 32px !important;
    min-width: 32px !important;
    min-height: 32px !important;
    font-size: 1.1rem !important;
    border-radius: 8px !important;
  }

  .farmer-income-page-modal .btn-close-modal {
    padding: 6px 14px !important;
    font-size: 13px !important;
    min-height: 32px !important;
    border-width: 1px !important;
    border-radius: 8px !important;
    font-weight: 600 !important;
  }

  .farmer-income-page-modal .detail-table th,
  .farmer-income-page-modal .detail-table td {
    padding: 7px 8px !important;
    font-size: 12px !important;
  }
}

@media (min-width: 769px) and (max-width: 1280px) {
  html body .page-container.farmer-income-page.machinery-ui .tab-nav {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .tab-btn {
    min-height: 34px !important;
    font-size: 11px !important;
    padding: 7px 8px !important;
  }
}

@media (max-width: 768px) {
  html body .page-container.farmer-income-page.machinery-ui {
    padding: 8px 10px 12px !important;
    font-size: 14px !important;
    line-height: 1.4 !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .page-header-split {
    margin-bottom: 6px !important;
    padding: 8px 10px !important;
    border-radius: 10px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui h1.page-title,
  html body .page-container.farmer-income-page.machinery-ui .page-title {
    font-size: 1rem !important;
    line-height: 1.2 !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .page-subtitle {
    font-size: 0.68rem !important;
    line-height: 1.3 !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .tab-nav {
    gap: 4px !important;
    margin-bottom: 6px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .tab-btn {
    min-height: 34px !important;
    padding: 5px 4px !important;
    font-size: 0.65rem !important;
    border-radius: 8px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .form-wrapper,
  html body .page-container.farmer-income-page.machinery-ui .income-form,
  html body .page-container.farmer-income-page.machinery-ui .predictive-wrapper {
    display: flex !important;
    flex-direction: column !important;
    gap: 4px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .edit-banner {
    padding: 6px 8px !important;
    margin-bottom: 0 !important;
    font-size: 0.72rem !important;
    gap: 6px !important;
    border-radius: 8px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .cancel-edit-btn {
    min-height: 30px !important;
    padding: 4px 10px !important;
    font-size: 0.72rem !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .form-section {
    padding: 6px 8px !important;
    margin-bottom: 0 !important;
    border-radius: 8px !important;
    border-width: 1px !important;
    box-shadow: 0 2px 8px rgba(6, 12, 9, 0.18) !important;
  }

  html body .page-container.farmer-income-page.machinery-ui h2.section-title,
  html body .page-container.farmer-income-page.machinery-ui h3.section-title,
  html body .page-container.farmer-income-page.machinery-ui .section-title {
    font-size: 0.82rem !important;
    margin: 0 0 3px !important;
    padding-bottom: 3px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .form-row {
    gap: 3px !important;
    margin-bottom: 3px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .form-row:last-child {
    margin-bottom: 0 !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .form-group {
    gap: 1px !important;
    margin-bottom: 0 !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .form-group label {
    font-size: 0.68rem !important;
    margin: 0 !important;
    line-height: 1.25 !important;
  }

  html body .page-container.farmer-income-page.machinery-ui :is(
    .form-group input,
    .form-group select,
    .dynamic-table td input,
    .dynamic-table td select
  ) {
    padding: 4px 8px !important;
    font-size: 14px !important;
    min-height: 34px !important;
    height: 34px !important;
    border-width: 1px !important;
    border-radius: 8px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .form-group input[type='file'] {
    height: auto !important;
    min-height: 32px !important;
    padding: 3px 6px !important;
    font-size: 12px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .dynamic-table-wrapper {
    margin: 0 !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .dynamic-table tbody tr {
    margin-bottom: 4px !important;
    padding: 6px 7px !important;
    border-radius: 8px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .dynamic-table tbody tr.has-remove {
    padding-top: 1.85rem !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .dt-label {
    font-size: 0.58rem !important;
    margin-bottom: 2px !important;
    line-height: 1.15 !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .dynamic-table tbody td {
    padding: 0 0 4px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .dynamic-table tbody td:last-child {
    padding-bottom: 0 !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .dynamic-table td.computed-cell {
    padding: 4px 0 0 !important;
    gap: 4px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .dt-value {
    font-size: 0.78rem !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .dynamic-table tfoot tr {
    padding: 4px 0 0 !important;
    gap: 4px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui :is(.total-label, .total-value) {
    padding-top: 0 !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .dynamic-table tfoot .total-label {
    font-size: 0.68rem !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .dynamic-table tfoot .total-value {
    font-size: 0.78rem !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .remove-btn,
  html body .page-container.farmer-income-page.machinery-ui .dynamic-table td.dt-actions-cell .remove-btn {
    width: 28px !important;
    height: 28px !important;
    min-width: 28px !important;
    min-height: 28px !important;
    font-size: 1rem !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .add-row-btn {
    margin-top: 4px !important;
    padding: 5px 8px !important;
    font-size: 0.72rem !important;
    min-height: 32px !important;
    border-radius: 8px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .labor-total-box {
    padding: 5px 8px !important;
    margin-top: 4px !important;
    border-radius: 8px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .labor-total-label {
    font-size: 0.72rem !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .labor-total-value {
    font-size: 0.82rem !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .summary-section {
    border-width: 1px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .summary-grid {
    gap: 4px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .summary-item {
    padding: 5px 6px !important;
    border-radius: 8px !important;
    border-width: 1px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .summary-item .summary-label {
    font-size: 0.58rem !important;
    margin-bottom: 2px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .summary-item .summary-value {
    font-size: 0.82rem !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .form-actions {
    gap: 4px !important;
    margin-top: 4px !important;
    padding: 0 !important;
  }

  html body .page-container.farmer-income-page.machinery-ui :is(.btn-submit, .btn-reset) {
    min-height: 34px !important;
    padding: 6px 10px !important;
    font-size: 0.78rem !important;
    border-radius: 8px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .predictive-actions {
    gap: 4px !important;
    margin-top: 6px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .predictive-actions :is(.btn-submit, .btn-reset) {
    min-height: 34px !important;
    font-size: 0.78rem !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .foundation-summary,
  html body .page-container.farmer-income-page.machinery-ui .model-info-box {
    padding: 6px 8px !important;
    margin-top: 6px !important;
    font-size: 0.72rem !important;
    border-radius: 8px !important;
  }
}

@media (max-width: 480px) {
  html body .page-container.farmer-income-page.machinery-ui {
    padding: 6px 8px 10px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .form-wrapper,
  html body .page-container.farmer-income-page.machinery-ui .income-form,
  html body .page-container.farmer-income-page.machinery-ui .predictive-wrapper {
    gap: 3px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .form-section {
    padding: 5px 7px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .section-title {
    font-size: 0.78rem !important;
  }

  html body .page-container.farmer-income-page.machinery-ui :is(
    .form-group input,
    .form-group select,
    .dynamic-table td input,
    .dynamic-table td select
  ) {
    min-height: 32px !important;
    height: 32px !important;
    font-size: 14px !important;
    padding: 3px 7px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .tab-btn {
    min-height: 32px !important;
    font-size: 0.62rem !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .summary-grid {
    grid-template-columns: 1fr 1fr !important;
    gap: 3px !important;
  }

  html body .page-container.farmer-income-page.machinery-ui .summary-item .summary-value {
    font-size: 0.78rem !important;
  }
}
</style>
