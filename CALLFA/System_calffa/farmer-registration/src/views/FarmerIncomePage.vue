<template>
  <div class="page-container farmer-income-page" :class="{ 'light-theme': isLight }">
    <div class="page-header">
      <h1 class="page-title">Talaan ng Kita sa Pagsasaka</h1>
      <p class="page-subtitle">Punan ang form na ito para maitala ang iyong gastos at kita sa pagsasaka. Kinakailangan para sa eligibility sa tulong na pang-agrikultura tulad ng pataba at binhi.</p>
    </div>

    <!-- Success/Error Messages -->
    <div v-if="successMessage" class="alert alert-success">
      <span>{{ successMessage }}</span>
      <button class="alert-close" @click="successMessage = ''">&times;</button>
    </div>
    <div v-if="errorMessage" class="alert alert-error">
      <span>{{ errorMessage }}</span>
      <button class="alert-close" @click="errorMessage = ''">&times;</button>
    </div>

    <!-- Tab Navigation -->
    <div class="tab-nav">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'form' }"
        @click="activeTab = 'form'; if (editingRecordId) cancelEdit()"
      >
        {{ editingRecordId ? 'I-edit ang Talaan' : 'Bagong Talaan' }}
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'history' }"
        @click="activeTab = 'history'; fetchRecords()"
      >
        Mga Naunang Talaan
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'assistance' }"
        @click="activeTab = 'assistance'; fetchCompletedAssistance()"
      >
        Tulong na Natanggap
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'predictive' }"
        @click="activeTab = 'predictive'; loadPredictiveData()"
      >
        Predictive Analytics
      </button>
    </div>

    <!-- FORM TAB -->
    <div v-if="activeTab === 'form'" class="form-wrapper">
      <!-- Edit mode banner -->
      <div v-if="editingRecordId" class="edit-banner">
        <span>Ine-edit mo ang talaan mula {{ formatDate(editingCreatedAt) }}</span>
        <button class="cancel-edit-btn" @click="cancelEdit">Kanselahin</button>
      </div>
      <form @submit.prevent="submitForm" class="income-form">

        <!-- Section 1: Farm Details -->
        <div class="form-section">
          <h2 class="section-title">Detalye ng Taniman</h2>
          <div class="form-row">
            <div class="form-group">
              <label>Lawak ng Taniman (Ektarya)</label>
              <input
                type="number"
                v-model.number="form.area_hectares"
                placeholder="Halimbawa: 1.5"
                step="0.01"
                min="0.01"
                required
              />
            </div>
            <div class="form-group">
              <label>Paraan ng Pagtatanim</label>
              <select v-model="form.planting_method" required>
                <option value="">-- Pumili --</option>
                <option value="sabog">Sabog</option>
                <option value="talok">Talok</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group full-width">
              <label>Patubig</label>
              <select v-model="form.irrigation_type" required>
                <option value="">-- Pumili --</option>
                <option value="NIA">NIA</option>
                <option value="bugsok_waterpump">Bugsok na Waterpump</option>
                <option value="waterpump_irrigation">Waterpump na Nakalawit sa Irrigation</option>
                <option value="waterpump_ilog">Waterpump na Nakalawit sa Ilog</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Section 2: Abono (Fertilizers) -->
        <div class="form-section">
          <h2 class="section-title">Mga Ginamit na Abono</h2>
          <div class="dynamic-table-wrapper">
            <table class="dynamic-table">
              <thead>
                <tr>
                  <th>Klase ng Abono</th>
                  <th>Ilan Sako</th>
                  <th>Presyo Kada Sako (₱)</th>
                  <th>Kabuuan (₱)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in form.fertilizers" :key="'fert-' + index">
                  <td>
                    <select v-model="item.type" required>
                      <option value="">-- Pumili --</option>
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
                    <input
                      type="number"
                      v-model.number="item.sacks"
                      placeholder="0"
                      min="0"
                      step="1"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      v-model.number="item.price_per_sack"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td class="computed-cell">
                    ₱{{ fertilizerLineTotal(item).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}
                  </td>
                  <td>
                    <button
                      type="button"
                      class="remove-btn"
                      @click="removeFertilizer(index)"
                      v-if="form.fertilizers.length > 1"
                      title="Alisin"
                    >&times;</button>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" class="total-label">Kabuuang Halaga sa Abono:</td>
                  <td class="total-value">
                    ₱{{ totalFertilizerCost.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <button type="button" class="add-row-btn" @click="addFertilizer">
            Magdagdag ng Abono
          </button>
        </div>

        <!-- Section 3: Pesticides -->
        <div class="form-section">
          <h2 class="section-title">Mga Ginamit na Lason</h2>
          <div class="dynamic-table-wrapper">
            <table class="dynamic-table">
              <thead>
                <tr>
                  <th>Klase ng Lason</th>
                  <th>Ilang Bote/Pack</th>
                  <th>Presyo Kada Bote/Pack (₱)</th>
                  <th>Kabuuan (₱)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in form.pesticides" :key="'pest-' + index">
                  <td>
                    <input
                      type="text"
                      v-model="item.type"
                      placeholder="Pangalan ng lason"
                      required
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      v-model.number="item.quantity"
                      placeholder="0"
                      min="0"
                      step="1"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      v-model.number="item.price_per_unit"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td class="computed-cell">
                    ₱{{ pesticideLineTotal(item).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}
                  </td>
                  <td>
                    <button
                      type="button"
                      class="remove-btn"
                      @click="removePesticide(index)"
                      v-if="form.pesticides.length > 1"
                      title="Alisin"
                    >&times;</button>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" class="total-label">Kabuuang Halaga sa Lason:</td>
                  <td class="total-value">
                    ₱{{ totalPesticideCost.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <button type="button" class="add-row-btn" @click="addPesticide">
            Magdagdag ng Lason
          </button>
        </div>

        <!-- Section 4: Labor & Other Expenses -->
        <div class="form-section">
          <h2 class="section-title">Gastos sa Labor at Iba Pa</h2>
          <div class="form-row">
            <div class="form-group">
              <label>Gastos sa Paghahanda ng Lupang Taniman (₱)</label>
              <input type="number" v-model.number="form.land_preparation_cost" placeholder="0.00" min="0" step="0.01" />
            </div>
            <div class="form-group">
              <label>Gastos sa Bunot / Talok / Hasik (₱)</label>
              <input type="number" v-model.number="form.planting_cost" placeholder="0.00" min="0" step="0.01" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Gastos sa Pagspray / Pagsabog ng Abono at Iba Pa (₱)</label>
              <input type="number" v-model.number="form.spraying_cost" placeholder="0.00" min="0" step="0.01" />
            </div>
            <div class="form-group">
              <label>Bayad sa Harvester (₱)</label>
              <input type="number" v-model.number="form.harvester_cost" placeholder="0.00" min="0" step="0.01" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Bayad sa Pagbibilad (₱)</label>
              <input type="number" v-model.number="form.drying_cost" placeholder="0.00" min="0" step="0.01" />
            </div>
            <div class="form-group">
              <label>Bayad sa Paghakot (₱)</label>
              <input type="number" v-model.number="form.hauling_cost" placeholder="0.00" min="0" step="0.01" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Tarasko (₱)</label>
              <input type="number" v-model.number="form.tarasko_cost" placeholder="0.00" min="0" step="0.01" />
            </div>
            <div class="form-group">
              <label>Krudo (₱)</label>
              <input type="number" v-model.number="form.fuel_cost" placeholder="0.00" min="0" step="0.01" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group full-width">
              <label>Iba Pang Gastos (₱)</label>
              <input type="number" v-model.number="form.other_expenses" placeholder="0.00" min="0" step="0.01" />
            </div>
          </div>
          <div class="labor-total-box">
            <span class="labor-total-label">Kabuuang Gastos sa Labor:</span>
            <span class="labor-total-value">₱{{ totalLaborCost.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
          </div>
        </div>

        <!-- Section 5: Harvest -->
        <div class="form-section">
          <h2 class="section-title">Ani</h2>
          <div class="form-row">
            <div class="form-group">
              <label>Ilang Sako ang Naani</label>
              <input type="number" v-model.number="form.sacks_harvested" placeholder="0" min="0" step="1" required />
            </div>
            <div class="form-group">
              <label>Kilo Kada Sako</label>
              <input type="number" v-model.number="form.kg_per_sack" placeholder="0" min="0" step="0.01" required />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Presyo Kada Kilo (₱)</label>
              <input type="number" v-model.number="form.price_per_kg" placeholder="0.00" min="0" step="0.01" required />
            </div>
          </div>
        </div>

        <!-- Summary Section -->
        <div class="form-section summary-section">
          <h2 class="section-title">Buod</h2>
          <div class="summary-grid">
            <div class="summary-item">
              <span class="summary-label">Kabuuang Ani (kg)</span>
              <span class="summary-value">{{ totalHarvestKg.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }} kg</span>
            </div>
            <div class="summary-item income">
              <span class="summary-label">Kabuuang Benta</span>
              <span class="summary-value">₱{{ grossIncome.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
            </div>
            <div class="summary-item expense">
              <span class="summary-label">Kabuuang Gastos</span>
              <span class="summary-value">₱{{ totalExpenses.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
            </div>
            <div class="summary-item" :class="netIncome >= 0 ? 'profit' : 'loss'">
              <span class="summary-label">Netong Kita</span>
              <span class="summary-value">₱{{ netIncome.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
            </div>
          </div>
        </div>

        <!-- Submit -->
        <div class="form-actions">
          <button type="button" class="btn-reset" @click="editingRecordId ? cancelEdit() : resetForm()">{{ editingRecordId ? 'Kanselahin' : 'I-reset' }}</button>
          <button type="submit" class="btn-submit" :disabled="submitting">
            <span v-if="submitting">{{ editingRecordId ? 'Ina-update...' : 'Sinusumite...' }}</span>
            <span v-else>{{ editingRecordId ? 'I-update ang Talaan' : 'I-save ang Talaan' }}</span>
          </button>
        </div>
      </form>
    </div>

    <!-- HISTORY TAB -->
    <div v-if="activeTab === 'history'" class="history-wrapper">
      <div v-if="loadingRecords" class="loading-state">
        <div class="spinner"></div>
        <p>Kinukuha ang mga talaan...</p>
      </div>
      <div v-else-if="records.length === 0" class="empty-state">
        <div class="empty-icon empty-icon-block" aria-hidden="true"></div>
        <p>Wala pang naitatalang kita. Punan ang form para magsimula!</p>
      </div>
      <div v-else class="records-list">
        <div
          v-for="record in records"
          :key="record.id"
          class="record-card"
        >
          <div class="record-header">
            <span class="record-date">{{ formatDate(record.created_at) }}</span>
            <div class="record-actions">
              <button class="edit-btn" @click="startEdit(record)">I-edit</button>
              <button class="view-btn" @click="openRecordDetail(record)">Tingnan</button>
            </div>
          </div>
          <div class="record-body">
            <div class="record-info-grid">
              <div class="record-info-item">
                <span class="detail-label">Lawak</span>
                <span class="detail-value">{{ record.area_hectares }} ektarya</span>
              </div>
              <div class="record-info-item">
                <span class="detail-label">Pagtatanim</span>
                <span class="detail-value">{{ record.planting_method }}</span>
              </div>
              <div class="record-info-item">
                <span class="detail-label">Patubig</span>
                <span class="detail-value">{{ formatIrrigation(record.irrigation_type) }}</span>
              </div>
              <div class="record-info-item record-info-item-wide">
                <span class="detail-label">Ani</span>
                <span class="detail-value">{{ record.sacks_harvested }} sako × {{ record.kg_per_sack }} kg @ ₱{{ record.price_per_kg }}/kg</span>
              </div>
            </div>
          </div>
          <div class="record-financials">
            <div class="financial-item income">
              <span class="financial-label">Benta</span>
              <span class="financial-value">₱{{ parseFloat(record.gross_income || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
            </div>
            <div class="financial-item expense">
              <span class="financial-label">Gastos</span>
              <span class="financial-value">₱{{ parseFloat(record.total_expenses || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
            </div>
            <div class="financial-item" :class="parseFloat(record.net_income || 0) >= 0 ? 'profit' : 'loss'">
              <span class="financial-label">Net</span>
              <span class="financial-value">₱{{ parseFloat(record.net_income || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ASSISTANCE TAB -->
    <div v-if="activeTab === 'assistance'" class="assistance-wrapper">
      <div v-if="loadingAssistance" class="loading-state">
        <div class="spinner"></div>
        <p>Kinukuha ang tulong na natanggap...</p>
      </div>
      <div v-else-if="completedAssistance.length === 0" class="empty-state">
        <div class="empty-icon empty-icon-block" aria-hidden="true"></div>
        <p>Walang natanggapang tulong pa. Maghintay na kayo ay maging eligible at lumikha ng tulong.</p>
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
              <span class="status-badge completed">Natanggap</span>
            </div>

            <div class="card-body">
              <div class="info-row">
                <div class="info-item">
                  <span class="info-label">Petsa ng Talaan</span>
                  <span class="info-value">{{ formatDate(assist.created_at) }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Dami</span>
                  <span class="info-value quantity-highlight">{{ assist.notes ? extractQuantityFromNotes(assist.notes) : assist.quantity + ' ' + (assist.unit || 'sako') }}</span>
                </div>
              </div>

              <div class="info-row dates-row">
                <div v-if="assist.distribution_date" class="info-item">
                  <span class="info-label">Araw ng Pamamahagi</span>
                  <span class="info-value">{{ formatDate(assist.distribution_date) }}</span>
                </div>
                <div v-if="assist.received_date" class="info-item">
                  <span class="info-label">Araw ng Pagtanggap</span>
                  <span class="info-value">{{ formatDate(assist.received_date) }}</span>
                </div>
              </div>

              <div v-if="assist.notes && !assist.notes.startsWith('Pataba')" class="notes-section">
                <span class="notes-label">Tala</span>
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
        <h2 class="section-title">Predicted Future Expenses</h2>

        <div class="form-row">
          <div class="form-group">
            <label>Target Farmer ID</label>
            <input v-if="!isPresident" type="text" :value="targetFarmerId || '-'" disabled />
            <select v-else v-model="selectedForecastFarmerId" @change="loadPredictiveData">
              <option value="">-- Pumili ng farmer --</option>
              <option v-for="f in barangayFarmers" :key="f.id" :value="String(f.id)">
                #{{ f.id }} - {{ f.full_name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Foundation Data (CSV/JSON)</label>
            <input type="file" accept=".csv,.json,text/csv,application/json" @change="onFoundationFileChange" />
          </div>
        </div>

        <div class="predictive-actions">
          <button class="btn-submit" type="button" :disabled="foundationUploading || !canUploadFoundation" @click="uploadFoundationFile">
            <span v-if="foundationUploading">Uploading...</span>
            <span v-else>Upload Historical Foundation</span>
          </button>
          <button class="btn-reset" type="button" :disabled="foundationDeleting || !targetFarmerId" @click="clearFoundation">
            <span v-if="foundationDeleting">Removing...</span>
            <span v-else>Clear Foundation</span>
          </button>
          <button class="btn-submit" type="button" :disabled="forecastLoading || !targetFarmerId" @click="fetchExpenseForecast">
            <span v-if="forecastLoading">Forecasting...</span>
            <span v-else>Run Expense Forecast</span>
          </button>
        </div>

        <div class="foundation-summary" v-if="foundationSummary">
          <p><strong>Foundation Farmer ID:</strong> {{ foundationSummary.farmer_id }}</p>
          <p><strong>Uploaded Points:</strong> {{ foundationSummary.count || 0 }}</p>
          <p v-if="foundationSummary.updated_at"><strong>Last Updated:</strong> {{ formatDate(foundationSummary.updated_at) }}</p>
          <p v-if="(foundationSummary.preview || []).length > 0">
            <strong>Preview:</strong> {{ foundationSummary.preview.join(', ') }}
          </p>
        </div>
      </div>

      <div class="form-section" v-if="forecastResult">
        <h3 class="section-title">Forecast Result</h3>
        <div v-if="forecastResult.ok" class="summary-grid">
          <div class="summary-item expense">
            <span class="summary-label">Predicted Future Expense</span>
            <span class="summary-value">₱{{ formatPeso(forecastResult.forecast_next?.predicted_total_expenses) }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">95% Confidence Interval</span>
            <span class="summary-value">
              ₱{{ formatPeso(forecastResult.forecast_next?.ci95_low) }} - ₱{{ formatPeso(forecastResult.forecast_next?.ci95_high) }}
            </span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Model Quality (R²)</span>
            <span class="summary-value">{{ forecastResult.forecast_next?.r_squared ?? '-' }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Training Points</span>
            <span class="summary-value">{{ forecastResult.training_n || 0 }}</span>
          </div>
        </div>
        <div v-else class="alert alert-error">
          <span>{{ forecastResult.error || 'Forecast failed.' }}</span>
        </div>

        <div class="model-info-box" v-if="forecastResult.ok">
          <p><strong>Model Used:</strong> {{ forecastResult.model || 'N/A' }}</p>
          <p>
            <strong>Engine:</strong>
            {{ forecastResult.ml_engine === 'python_sklearn' ? 'Python sklearn' : 'Node.js OLS fallback' }}
          </p>
          <p>{{ forecastResult.method_description_ph || '' }}</p>
        </div>
      </div>
    </div>

    <!-- VIEW DETAIL MODAL -->
    <Teleport to="body">
      <div v-if="showDetailModal" class="modal-overlay farmer-income-page-modal" :class="{ 'light-theme': isLight }" @click.self="closeDetailModal">
        <div class="modal-container">
          <div class="modal-header">
            <h2>Buong Detalye ng Talaan</h2>
            <button class="modal-close" @click="closeDetailModal">&times;</button>
          </div>
          <div class="modal-body" v-if="selectedRecord">

            <!-- Farm Info -->
            <div class="detail-section">
              <h3 class="detail-section-title">Detalye ng Taniman</h3>
              <div class="detail-grid">
                <div class="detail-cell">
                  <span class="cell-label">Petsa ng Talaan</span>
                  <span class="cell-value">{{ formatDate(selectedRecord.created_at) }}</span>
                </div>
                <div class="detail-cell">
                  <span class="cell-label">Lawak (Ektarya)</span>
                  <span class="cell-value">{{ selectedRecord.area_hectares }}</span>
                </div>
                <div class="detail-cell">
                  <span class="cell-label">Paraan ng Pagtatanim</span>
                  <span class="cell-value">{{ selectedRecord.planting_method === 'sabog' ? 'Sabog' : 'Talok' }}</span>
                </div>
                <div class="detail-cell">
                  <span class="cell-label">Patubig</span>
                  <span class="cell-value">{{ formatIrrigation(selectedRecord.irrigation_type) }}</span>
                </div>
              </div>
            </div>

            <!-- Fertilizers -->
            <div class="detail-section" v-if="selectedRecord.fertilizers && selectedRecord.fertilizers.length > 0">
              <h3 class="detail-section-title">Mga Ginamit na Abono</h3>
              <table class="detail-table">
                <thead>
                  <tr>
                    <th>Klase</th>
                    <th>Sako</th>
                    <th>Presyo/Sako</th>
                    <th>Kabuuan</th>
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
                    <td colspan="3" class="foot-label">Kabuuang Abono:</td>
                    <td class="foot-value">₱{{ parseFloat(selectedRecord.total_fertilizer_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div class="detail-section" v-else>
              <h3 class="detail-section-title">Mga Ginamit na Abono</h3>
              <p class="no-data">Walang naitalang abono.</p>
            </div>

            <!-- Pesticides -->
            <div class="detail-section" v-if="selectedRecord.pesticides && selectedRecord.pesticides.length > 0">
              <h3 class="detail-section-title">Mga Ginamit na Lason</h3>
              <table class="detail-table">
                <thead>
                  <tr>
                    <th>Klase</th>
                    <th>Bilang</th>
                    <th>Presyo/Unit</th>
                    <th>Kabuuan</th>
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
                    <td colspan="3" class="foot-label">Kabuuang Lason:</td>
                    <td class="foot-value">₱{{ parseFloat(selectedRecord.total_pesticide_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div class="detail-section" v-else>
              <h3 class="detail-section-title">Mga Ginamit na Lason</h3>
              <p class="no-data">Walang naitalang lason.</p>
            </div>

            <!-- Labor & Expenses -->
            <div class="detail-section">
              <h3 class="detail-section-title">Gastos sa Labor at Iba Pa</h3>
              <div class="expense-grid">
                <div class="expense-row">
                  <span>Paghahanda ng Lupa</span>
                  <span>₱{{ parseFloat(selectedRecord.land_preparation_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="expense-row">
                  <span>Bunot / Talok / Hasik</span>
                  <span>₱{{ parseFloat(selectedRecord.planting_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="expense-row">
                  <span>Pagspray / Pagsabog ng Abono</span>
                  <span>₱{{ parseFloat(selectedRecord.spraying_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="expense-row">
                  <span>Bayad sa Harvester</span>
                  <span>₱{{ parseFloat(selectedRecord.harvester_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="expense-row">
                  <span>Bayad sa Pagbibilad</span>
                  <span>₱{{ parseFloat(selectedRecord.drying_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="expense-row">
                  <span>Bayad sa Paghakot</span>
                  <span>₱{{ parseFloat(selectedRecord.hauling_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="expense-row">
                  <span>Tarasko</span>
                  <span>₱{{ parseFloat(selectedRecord.tarasko_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="expense-row">
                  <span>Krudo</span>
                  <span>₱{{ parseFloat(selectedRecord.fuel_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="expense-row">
                  <span>Iba Pang Gastos</span>
                  <span>₱{{ parseFloat(selectedRecord.other_expenses || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="expense-row total-row">
                  <span>Kabuuang Labor:</span>
                  <span>₱{{ parseFloat(selectedRecord.total_labor_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
              </div>
            </div>

            <!-- Harvest -->
            <div class="detail-section">
              <h3 class="detail-section-title">Ani</h3>
              <div class="detail-grid">
                <div class="detail-cell">
                  <span class="cell-label">Sako na Naani</span>
                  <span class="cell-value">{{ selectedRecord.sacks_harvested }}</span>
                </div>
                <div class="detail-cell">
                  <span class="cell-label">Kilo Kada Sako</span>
                  <span class="cell-value">{{ selectedRecord.kg_per_sack }} kg</span>
                </div>
                <div class="detail-cell">
                  <span class="cell-label">Presyo Kada Kilo</span>
                  <span class="cell-value">₱{{ parseFloat(selectedRecord.price_per_kg || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="detail-cell">
                  <span class="cell-label">Kabuuang Ani</span>
                  <span class="cell-value">{{ (parseFloat(selectedRecord.sacks_harvested || 0) * parseFloat(selectedRecord.kg_per_sack || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }} kg</span>
                </div>
              </div>
            </div>

            <!-- Grand Summary -->
            <div class="detail-section summary-detail-section">
              <h3 class="detail-section-title">Buod</h3>
              <div class="grand-summary">
                <div class="grand-row income-row">
                  <span>Kabuuang Benta</span>
                  <span>₱{{ parseFloat(selectedRecord.gross_income || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="grand-row expense-summary-row">
                  <span>Kabuuang Gastos</span>
                  <span>₱{{ parseFloat(selectedRecord.total_expenses || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="grand-row" :class="parseFloat(selectedRecord.net_income || 0) >= 0 ? 'net-profit-row' : 'net-loss-row'">
                  <span>Netong Kita</span>
                  <span>₱{{ parseFloat(selectedRecord.net_income || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
              </div>
            </div>

          </div>
          <div class="modal-footer">
            <button class="btn-close-modal" @click="closeDetailModal">Isara</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useBackdropTheme } from '../composables/useBackdropTheme'

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
const foundationDeleting = ref(false)
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
    errorMessage.value = 'Hindi ka naka-login. Mag-login muna.'
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
    if (!res.ok) throw new Error(data.error || 'May problema sa pag-save.')

    successMessage.value = editingRecordId.value
      ? 'Matagumpay na na-update ang talaan!'
      : 'Matagumpay na naitala ang iyong kita!'
    cancelEdit()
  } catch (err) {
    errorMessage.value = err.message
  } finally {
    submitting.value = false
  }
}

// ─── Edit helpers ───
const startEdit = (record) => {
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
    if (!res.ok) throw new Error(data.error || 'Hindi makuha ang mga talaan.')
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
    if (!res.ok) throw new Error(data.error || 'Hindi makuha ang tulong na natanggap.')
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
    if (!res.ok || !data?.ok) throw new Error(data?.error || 'Hindi makuha ang listahan ng farmers.')
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
    if (!res.ok || !data?.ok) throw new Error(data?.error || 'Hindi makuha ang foundation summary.')
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
    if (!res.ok && data?.error) {
      throw new Error(data.error)
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
    if (!res.ok || !data?.ok) throw new Error(data?.error || 'Hindi na-upload ang file.')
    successMessage.value = data.message || 'Foundation uploaded.'
    foundationFile.value = null
    await fetchFoundationSummary()
    await fetchExpenseForecast()
  } catch (err) {
    errorMessage.value = err.message
  } finally {
    foundationUploading.value = false
  }
}

const clearFoundation = async () => {
  if (!targetFarmerId.value) return
  foundationDeleting.value = true
  try {
    const res = await fetch(`/api/farmer-income/expense-history-foundation/${targetFarmerId.value}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    const data = await res.json()
    if (!res.ok || !data?.ok) throw new Error(data?.error || 'Hindi na-clear ang foundation.')
    successMessage.value = data.message || 'Foundation removed.'
    foundationSummary.value = null
    await fetchExpenseForecast()
  } catch (err) {
    errorMessage.value = err.message
  } finally {
    foundationDeleting.value = false
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
  return new Date(dateStr).toLocaleDateString('fil-PH', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
}

const formatPeso = (value) => {
  const n = parseFloat(value || 0)
  if (!Number.isFinite(n)) return '0.00'
  return n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const formatIrrigation = (type) => {
  const map = {
    'NIA': 'NIA',
    'bugsok_waterpump': 'Bugsok na Waterpump',
    'waterpump_irrigation': 'Waterpump na Nakalawit sa Irrigation',
    'waterpump_ilog': 'Waterpump na Nakalawit sa Ilog'
  }
  return map[type] || type
}

const formatPlanting = (method) => {
  return method === 'sabog' ? 'Sabog' : 'Talok'
}

const formatAssistanceType = (type) => {
  const map = { 'fertilizer': 'Pataba', 'seeds': 'Binhi', 'both': 'Pataba at Binhi' }
  return map[type] || type
}

const extractQuantityFromNotes = (notes) => {
  if (!notes) return ''
  const quantityPart = notes.split(' - ')[0]
  return quantityPart.trim()
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
  if (!dateStr) return 'Kamakailan'
  const date = new Date(dateStr)
  const now = new Date()
  const days = Math.floor((now - date) / (1000 * 60 * 60 * 24))
  
  if (days === 0) return 'Ngayong araw'
  if (days === 1) return 'Kahapon'
  if (days < 7) return `${days} araw na ang nakakaraan`
  if (days < 30) return `${Math.floor(days / 7)} linggo na ang nakakaraan`
  if (days < 365) return `${Math.floor(days / 30)} buwan na ang nakakaraan`
  return `${Math.floor(days / 365)} taon na ang nakakaraan`
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
.page-container {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 1rem;
}

.page-container:not(.light-theme) .page-header {
  background: rgba(25, 38, 29, 0.92);
  border: 1px solid rgba(190, 235, 203, 0.13);
  border-radius: 20px;
  padding: 32px 38px;
  margin-bottom: 24px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35), inset 1px 1px 0 rgba(255, 255, 255, 0.06);
  position: relative;
  overflow: hidden;
}

.page-container:not(.light-theme) .page-header::before {
  content: '';
  position: absolute;
  top: -40px;
  right: -40px;
  width: 220px;
  height: 220px;
  background: radial-gradient(circle, rgba(45, 212, 191, 0.13) 0%, transparent 65%);
  pointer-events: none;
}

.page-container:not(.light-theme) .page-title {
  margin: 0;
  font-size: 34px;
  font-weight: 800;
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
}

.page-container:not(.light-theme) .page-subtitle {
  margin: 6px 0 0 0;
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
  font-size: 17px;
  opacity: 0.92;
}

/* Alerts */
.alert {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
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
}

/* Tab Navigation */
.tab-nav {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 2rem;
  align-items: center;
}
.page-container:not(.light-theme) .tab-btn {
  padding: 0.78rem 1.3rem;
  border: 1px solid rgba(190, 235, 203, 0.28) !important;
  background: rgba(255, 255, 255, 0.08) !important;
  border-radius: 12px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 700;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  transition: all 0.22s ease;
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

/* Form Sections */
.form-section {
  background: #ffffff;
  border: 1px solid rgba(167, 243, 208, 0.45);
  border-radius: 16px;
  padding: 2.15rem;
  margin-bottom: 2rem;
  box-shadow: 0 10px 20px rgba(6, 16, 11, 0.2);
}

.section-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: #166534;
  margin: 0 0 1rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(167, 243, 208, 0.65);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.2rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}
.form-group.full-width {
  grid-column: 1 / -1;
}
.form-group label {
  font-size: 0.92rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.35rem;
}
.form-group input,
.form-group select {
  padding: 1.05rem 1.1rem;
  border: 1px solid rgba(110, 231, 183, 0.35);
  border-radius: 12px;
  font-size: 0.95rem;
  transition: border-color 0.2s;
  background: rgba(245, 255, 250, 0.9);
}
.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #16a34a;
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
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
  background: #fee2e2;
  color: #dc2626;
  border: none;
  border-radius: 6px;
  width: 28px;
  height: 28px;
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.remove-btn:hover {
  background: #dc2626;
  color: white;
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
  gap: 1rem;
}
.record-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 1.25rem 1.35rem;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
}
.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding-bottom: 0.95rem;
  border-bottom: 1px solid #e5e7eb;
}
.page-container:not(.light-theme) .record-header {
  border-bottom-color: rgba(134, 239, 172, 0.18);
}
.page-container:not(.light-theme) .record-date {
  font-weight: 700;
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
  font-size: 1rem;
}
.record-body {
  padding: 0.95rem 0;
}
.record-info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem 1.25rem;
}
.record-info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}
.record-info-item-wide {
  grid-column: 1 / -1;
}
.detail-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
}
.page-container:not(.light-theme) .detail-label {
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
  opacity: 0.85;
}
.detail-value {
  font-size: 0.92rem;
  font-weight: 600;
  line-height: 1.45;
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
  gap: 0.65rem;
  padding-top: 0.95rem;
  border-top: 1px solid #e5e7eb;
}
.page-container:not(.light-theme) .record-financials {
  border-top-color: rgba(134, 239, 172, 0.18);
}
.financial-item {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.7rem 0.75rem;
  border-radius: 10px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
}
.page-container:not(.light-theme) .financial-item {
  background: rgba(0, 0, 0, 0.22);
  border-color: rgba(134, 239, 172, 0.12);
}
.financial-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6b7280;
}
.page-container:not(.light-theme) .financial-label {
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
  opacity: 0.85;
}
.financial-value {
  font-size: 0.95rem;
  font-weight: 800;
}
.financial-item.income .financial-value { color: #2563eb; }
.financial-item.expense .financial-value { color: #dc2626; }
.financial-item.profit .financial-value { color: #166534; }
.financial-item.loss .financial-value { color: #dc2626; }

/* Responsive */
@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  .summary-grid {
    grid-template-columns: 1fr 1fr;
  }
  .record-info-grid {
    grid-template-columns: 1fr;
  }
  .record-financials {
    grid-template-columns: 1fr;
  }
  .tab-nav {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
  .form-actions {
    flex-direction: column;
  }
  .btn-submit, .btn-reset {
    width: 100%;
    text-align: center;
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

/* Modal Overlay */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}
.modal-container {
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 720px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  overflow: hidden;
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
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.assistance-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  border: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
}

.assistance-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
  border-color: #86efac;
}

/* Card Header */
.assistance-card .card-header {
  padding: 1rem;
  border-bottom: 2px solid #f3f4f6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.assistance-type-badge {
  display: inline-block;
  padding: 0.35rem 0.85rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 700;
  white-space: nowrap;
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
  padding: 0.3rem 0.75rem;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-badge.completed {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #6ee7b7;
}

/* Card Body */
.assistance-card .card-body {
  padding: 1.25rem;
  flex: 1;
}

.info-row {
  margin-bottom: 1rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.info-row.dates-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #f3f4f6;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.info-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.info-value {
  font-size: 0.95rem;
  font-weight: 600;
  color: #1f2937;
}

.quantity-highlight {
  font-size: 1.1rem;
  color: #16a34a;
  font-weight: 700;
}

.notes-section {
  background: #f9fafb;
  border-left: 3px solid #16a34a;
  padding: 0.75rem;
  border-radius: 6px;
  margin-top: 0.75rem;
}

.notes-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-bottom: 0.35rem;
}

.notes-content {
  font-size: 0.85rem;
  color: #374151;
  margin: 0;
  line-height: 1.4;
}

/* Card Footer */
.assistance-card .card-footer {
  padding: 0.75rem 1.25rem;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: center;
}

.badge-info {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.35rem 0.75rem;
  border-radius: 12px;
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

.page-container:not(.light-theme) .computed-cell,
.page-container:not(.light-theme) .total-label,
.page-container:not(.light-theme) .total-value {
  color: #ecfdf5 !important;
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
  background: rgba(6, 12, 9, 0.78);
  backdrop-filter: blur(8px);
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

/* ===== LIGHT MODE — white surfaces ===== */
.page-container.farmer-income-page.light-theme .page-header {
  background: #ffffff !important;
  border: 2px solid #166534 !important;
  border-radius: 20px;
  padding: 32px 38px;
  margin-bottom: 24px;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.12) !important;
  position: relative;
  overflow: hidden;
}

.page-container.farmer-income-page.light-theme .page-title {
  margin: 0;
  font-size: 34px;
  font-weight: 800;
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
}

.page-container.farmer-income-page.light-theme .page-subtitle {
  margin: 6px 0 0 0;
  font-size: 17px;
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
}

.page-container.farmer-income-page.light-theme .tab-btn {
  padding: 0.78rem 1.3rem;
  border-radius: 12px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 700;
  background: #ffffff !important;
  border: 2px solid #166534 !important;
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
  box-shadow: 0 4px 14px rgba(22, 101, 52, 0.08) !important;
}

.page-container.farmer-income-page.light-theme .tab-btn.active,
.page-container.farmer-income-page.light-theme .tab-btn:hover:not(.active) {
  background: #ffffff !important;
  border: 2px solid #052e16 !important;
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
  box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.18), 0 4px 14px rgba(22, 101, 52, 0.1) !important;
}

.page-container.farmer-income-page.light-theme .card-sub {
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
}

.page-container.farmer-income-page.light-theme :is(
  .form-section,
  .summary-section,
  .record-card,
  .assistance-summary,
  .assistance-card,
  .summary-box,
  .modal-container,
  .empty-state
) {
  background: #ffffff !important;
  border: 2px solid #166534 !important;
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
  background: #ffffff !important;
  border: 2px solid rgba(22, 101, 52, 0.42) !important;
}

.page-container.farmer-income-page.light-theme .record-header {
  border-bottom: 2px solid rgba(22, 101, 52, 0.38) !important;
}

.page-container.farmer-income-page.light-theme .record-financials {
  border-top: 2px solid rgba(22, 101, 52, 0.38) !important;
}

.page-container.farmer-income-page.light-theme .section-title {
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
  border-bottom: 2px solid rgba(22, 101, 52, 0.38) !important;
  font-weight: 800 !important;
}

.page-container.farmer-income-page.light-theme .dynamic-table th,
.page-container.farmer-income-page.light-theme .detail-table th {
  background: #f0fdf4 !important;
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
  font-weight: 700 !important;
  border-bottom: 2px solid #166534 !important;
}

.page-container.farmer-income-page.light-theme .dynamic-table td,
.page-container.farmer-income-page.light-theme .detail-table td {
  border-bottom: 1.5px solid rgba(22, 101, 52, 0.3) !important;
}

.page-container.farmer-income-page.light-theme .view-btn,
.page-container.farmer-income-page.light-theme .edit-btn {
  background: #ffffff !important;
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
  border: 2px solid #166534 !important;
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
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
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
  border: 2px solid #166534 !important;
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
  color-scheme: light;
  caret-color: #000000;
  font-weight: 600;
}

.page-container.farmer-income-page.light-theme .form-group select option,
.page-container.farmer-income-page.light-theme .dynamic-table td select option {
  background: #ffffff !important;
  color: #000000 !important;
}

.page-container.farmer-income-page.light-theme .form-group input::placeholder,
.page-container.farmer-income-page.light-theme .dynamic-table td input::placeholder {
  color: #374151 !important;
  -webkit-text-fill-color: #374151 !important;
}

.page-container.farmer-income-page.light-theme .form-group input:-webkit-autofill,
.page-container.farmer-income-page.light-theme .form-group input:-webkit-autofill:focus,
.page-container.farmer-income-page.light-theme .dynamic-table td input:-webkit-autofill,
.page-container.farmer-income-page.light-theme .dynamic-table td input:-webkit-autofill:focus {
  -webkit-text-fill-color: #000000 !important;
  box-shadow: 0 0 0 1000px #ffffff inset !important;
}

.page-container.farmer-income-page.light-theme .labor-total-box {
  background: #f0fdf4 !important;
  border: 2px solid #166534 !important;
}

.page-container.farmer-income-page.light-theme .labor-total-label,
.page-container.farmer-income-page.light-theme .labor-total-value {
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
}

.page-container.farmer-income-page.light-theme .summary-item .summary-label {
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
  font-weight: 700 !important;
}

.page-container.farmer-income-page.light-theme .add-row-btn {
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
  border: 2px dashed #166534 !important;
  background: #f0fdf4 !important;
  font-weight: 700 !important;
}

.page-container.farmer-income-page.light-theme .foundation-summary,
.page-container.farmer-income-page.light-theme .model-info-box {
  background: #ffffff !important;
  border: 2px solid rgba(22, 101, 52, 0.42) !important;
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
}

.page-container.farmer-income-page.light-theme .model-info-box strong {
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
}

.page-container.farmer-income-page.light-theme .assistance-card .quantity-highlight {
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
}

.page-container.farmer-income-page.light-theme .assistance-card .badge-info {
  background: #f3f4f6 !important;
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
}

.page-container.farmer-income-page.light-theme .empty-state {
  background: #ffffff !important;
  border: 2px solid #166534 !important;
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
}

.page-container.farmer-income-page.light-theme input[type='file'] {
  color: #000000;
}

.page-container.farmer-income-page.light-theme input[type='file']::file-selector-button {
  background: #ffffff !important;
  border: 2px solid #166534 !important;
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
}

.farmer-income-page-modal.light-theme .modal-container {
  background: #ffffff !important;
  border: 2px solid #166534 !important;
  box-shadow: 0 24px 56px rgba(22, 101, 52, 0.15) !important;
}

.farmer-income-page-modal.light-theme .modal-body,
.farmer-income-page-modal.light-theme .cell-value,
.farmer-income-page-modal.light-theme .detail-table td,
.farmer-income-page-modal.light-theme .modal-header h2 {
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
}

.farmer-income-page-modal.light-theme .detail-section-title {
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
  font-weight: 800 !important;
}

.farmer-income-page-modal.light-theme .cell-label,
.farmer-income-page-modal.light-theme .no-data {
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
  font-weight: 600 !important;
}

.farmer-income-page-modal.light-theme .detail-table th {
  background: #f0fdf4 !important;
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
  border-bottom: 2px solid #166534 !important;
}

.farmer-income-page-modal.light-theme .detail-table td {
  border-bottom: 1.5px solid rgba(22, 101, 52, 0.3) !important;
}

.farmer-income-page-modal.light-theme .detail-cell {
  border: 2px solid rgba(22, 101, 52, 0.38) !important;
}

.farmer-income-page-modal.light-theme .summary-detail-section {
  background: #f0fdf4 !important;
  border: 2px solid rgba(22, 101, 52, 0.42) !important;
}

.farmer-income-page-modal.light-theme .modal-footer {
  background: #ffffff !important;
  border-top: 2px solid rgba(22, 101, 52, 0.35) !important;
}

.farmer-income-page-modal.light-theme .btn-close-modal {
  background: #ffffff !important;
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
  border: 2px solid #166534 !important;
}

.farmer-income-page-modal.light-theme .expense-row,
.farmer-income-page-modal.light-theme .expense-row span,
.farmer-income-page-modal.light-theme .income-row,
.farmer-income-page-modal.light-theme .grand-row span {
  background: #f9fafb !important;
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
  border: 2px solid rgba(22, 101, 52, 0.35) !important;
}

.farmer-income-page-modal.light-theme .detail-section {
  border-bottom: 2px solid rgba(22, 101, 52, 0.3) !important;
}

@media (max-width: 600px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
  .modal-container {
    max-height: 95vh;
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
