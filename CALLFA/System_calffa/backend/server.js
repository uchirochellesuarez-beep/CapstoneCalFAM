// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const farmerRoutes = require('./routes/farmers');
const authRoutes = require('./routes/auth');
const barangayRoutes = require('./routes/barangays');
const mlAssessmentsRoutes = require('./routes/ml-assessments');
const contributionsRoutes = require('./routes/contributions');
const loansRoutes = require('./routes/loans');
const loanPaymentsRoutes = require('./routes/loan-payments');
const machineryRoutes = require('./routes/machinery');
const machineryFinancialRoutes = require('./routes/machinery-financial');
const notificationsRoutes = require('./routes/notifications');
const testNotificationsRoutes = require('./routes/test-notifications');
const farmerIncomeRoutes = require('./routes/farmer-income');
const newsRoutes = require('./routes/news');
const shareCapitalRoutes = require('./routes/share-capital');
const seedFertilizerPlanRoutes = require('./routes/seed-fertilizer-plan');
const { startNotificationScheduler } = require('./scheduler/notification-scheduler');
const pool = require('./db');
const { ensureBarangayServicePlaces } = require('./schema/ensureBarangayServicePlaces');
const { runExpenseTrainingSampleSeed } = require('./services/expenseSampleSeedRunner');

function shouldRunStartupExpenseSampleSeed() {
  const v = String(
    process.env.EXPENSE_FORECAST_DISABLE_STARTUP_SAMPLE_SEED || ''
  )
    .trim()
    .toLowerCase();
  return v !== '1' && v !== 'true' && v !== 'yes';
}

const app = express();
app.use(bodyParser.json());

// Configure CORS more securely: allow specific origin in production via FRONTEND_ORIGIN.
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';
app.use(cors({ origin: FRONTEND_ORIGIN }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Use farmer routes
app.use('/api/farmers', farmerRoutes);
// Authentication routes (Google OAuth)
app.use('/api/auth', authRoutes);
// Barangay routes
app.use('/api/barangays', barangayRoutes);
// Financial routes
app.use('/api/contributions', contributionsRoutes);
app.use('/api/share-capital', shareCapitalRoutes);
app.use('/api/seed-fertilizer-plan', seedFertilizerPlanRoutes);
app.use('/api/loans', loansRoutes);
app.use('/api/loan-payments', loanPaymentsRoutes);
app.use('/api/ml-assessments', mlAssessmentsRoutes);
// Machinery routes
app.use('/api/machinery', machineryRoutes);
app.use('/api/machinery-financial', machineryFinancialRoutes);
// Notification routes
app.use('/api/notifications', notificationsRoutes);
app.use('/api/test-notifications', testNotificationsRoutes);
// Farmer income routes
app.use('/api/farmer-income', farmerIncomeRoutes);
// News and announcement routes
app.use('/api', newsRoutes);


const PORT = process.env.PORT || 3000;
if (require.main === module) {
  ensureBarangayServicePlaces(pool)
    .then(async () => {
      console.log('✅ Barangay service places schema ready (table + booking link if needed).');

      if (shouldRunStartupExpenseSampleSeed()) {
        try {
          const r = await runExpenseTrainingSampleSeed(pool);
          if (r.inserted > 0 || r.skipped > 0 || r.skipped_no_farmer > 0) {
            const tail =
              r.skipped_no_farmer > 0
                ? ` ${r.skipped_no_farmer} row(s) skipped (no farmers.id for JSON farmer_id — forecast may still use on-disk panels).`
                : '';
            console.log(
              `✅ Expense sample seed (startup): +${r.inserted} new, ${r.skipped} duplicate fingerprint, dirs ${r.dirs.join(', ') || '—'}.${tail}`
            );
          }
        } catch (err) {
          console.warn('⚠️ Expense sample seed skipped (non-fatal):', err.message);
        }
      }
    })
    .catch((err) => {
      console.error('⚠️ Could not ensure barangay_service_places schema:', err.message);
    })
    .finally(() => {
      app.listen(PORT, () => {
        console.log(`🚜 Farmer backend running on http://localhost:${PORT}`);
        console.log(`📝 Registration endpoint: http://localhost:${PORT}/api/farmers/register`);
        startNotificationScheduler();
      });
    });
} else {
  module.exports = app;
}
