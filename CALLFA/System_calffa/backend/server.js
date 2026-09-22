// server.js
require('dotenv').config();
// Fail fast if JWT_SECRET is missing (no hardcoded fallback).
require('./utils/jwtSecret');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const farmerRoutes = require('./routes/farmers');
const authRoutes = require('./routes/auth');
const barangayRoutes = require('./routes/barangays');
const mlAssessmentsRoutes = require('./routes/ml-assessments');
const loansRoutes = require('./routes/loans');
const loanPaymentsRoutes = require('./routes/loan-payments');
const machineryRoutes = require('./routes/machinery');
const machineryFinancialRoutes = require('./routes/machinery-financial');
const notificationsRoutes = require('./routes/notifications');
const farmerIncomeRoutes = require('./routes/farmer-income');
const operatorIncomeRoutes = require('./routes/operator-income');
const newsRoutes = require('./routes/news');
const shareCapitalRoutes = require('./routes/share-capital');
const seedFertilizerPlanRoutes = require('./routes/seed-fertilizer-plan');
const { startNotificationScheduler } = require('./scheduler/notification-scheduler');
const { ensureNotificationSchema } = require('./services/notification-service');
const { ensureOperatorAssignmentSchema } = require('./schema/ensureOperatorAssignment');
const { ensurePendingExpenseSchema } = require('./schema/ensurePendingExpenseSchema');
const { ensureDownPaymentSchema } = require('./schema/ensureDownPaymentSchema');
const { ensureBalancePaymentSchema } = require('./schema/ensureBalancePaymentSchema');
const { ensureRefundWorkflowSchema } = require('./schema/ensureRefundWorkflowSchema');
const { ensureBarangaySecuritySchema } = require('./schema/ensureBarangaySecuritySchema');
const { ensureLoanModuleSchema } = require('./schema/ensureLoanModuleSchema');
const { ensureFarmerIncomeStatusSchema } = require('./schema/ensureFarmerIncomeStatusSchema');
const { ensureManualIncomeSchema } = require('./schema/ensureManualIncomeSchema');
const { ensureAnnouncementViewsSchema } = require('./schema/ensureAnnouncementViewsSchema');
const { ensureActiveSessionSchema } = require('./schema/ensureActiveSessionSchema');
const { ensureMachineryStatusSchema } = require('./schema/ensureMachineryStatusSchema');
const { ensureMachineryPrerequisiteSchema } = require('./schema/ensureMachineryPrerequisiteSchema');
const { ensureMachineryInterestRateSchema } = require('./schema/ensureMachineryInterestRateSchema');
const { ensureInterestTrackingSchema } = require('./schema/ensureInterestTrackingSchema');
const { ensureMachineryHostingSchema } = require('./schema/ensureMachineryHostingSchema');
const { ensureGcashPaymentSchema } = require('./schema/ensureGcashPaymentSchema');
const { dropUnusedActivityLogs } = require('./schema/dropUnusedActivityLogs');
const { dropUnusedLegacyTables } = require('./schema/dropUnusedLegacyTables');
const { dropUnusedMachineryBookingColumns } = require('./schema/dropUnusedMachineryBookingColumns');
const { ensureMachineryCoreTables } = require('./schema/ensureMachineryCoreTables');
const { ensureReceiptTables } = require('./services/receipt-service');
const { ensureFarmersEmailColumn, ensureFarmersGoogleIdColumn } = require('./utils/googleAuth');
const pool = require('./db');
const { ensureBarangayServicePlaces } = require('./schema/ensureBarangayServicePlaces');
const { runExpenseTrainingSampleSeed } = require('./services/expenseSampleSeedRunner');

function shouldRunStartupExpenseSampleSeed() {
  const v = String(
    process.env.EXPENSE_FORECAST_ENABLE_STARTUP_SAMPLE_SEED || ''
  )
    .trim()
    .toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
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
app.use('/api/share-capital', shareCapitalRoutes);
app.use('/api/seed-fertilizer-plan', seedFertilizerPlanRoutes);
app.use('/api/financial-overview', require('./routes/financial-overview'));
app.use('/api/loans', loansRoutes);
app.use('/api/loan-payments', loanPaymentsRoutes);
app.use('/api/ml-assessments', mlAssessmentsRoutes);
// Machinery routes
app.use('/api/machinery', machineryRoutes);
app.use('/api/machinery-financial', machineryFinancialRoutes);
app.use('/api/receipts', require('./routes/receipts'));
app.use('/api/gcash-payments', require('./routes/gcash-payments'));
// Notification routes
app.use('/api/notifications', notificationsRoutes);
// Farmer income routes
app.use('/api/farmer-income', farmerIncomeRoutes);
// Operator income routes
app.use('/api/operator-income', operatorIncomeRoutes);
// News and announcement routes
app.use('/api', newsRoutes);


const PORT = process.env.PORT || 3000;
if (require.main === module) {
  (async () => {
    const schemaSteps = [
      () => ensureFarmersEmailColumn(pool),
      () => ensureFarmersGoogleIdColumn(pool),
      () => ensureBarangayServicePlaces(pool),
      () => ensureNotificationSchema(),
      () => ensureReceiptTables(pool),
      () => ensureMachineryCoreTables(pool),
      () => ensureOperatorAssignmentSchema(pool),
      () => ensurePendingExpenseSchema(pool),
      () => ensureDownPaymentSchema(pool),
      () => ensureBalancePaymentSchema(pool),
      () => ensureRefundWorkflowSchema(pool),
      () => ensureBarangaySecuritySchema(pool),
      () => ensureLoanModuleSchema(pool),
      () => ensureFarmerIncomeStatusSchema(pool),
      () => ensureManualIncomeSchema(pool),
      () => ensureAnnouncementViewsSchema(pool),
      () => ensureActiveSessionSchema(pool),
      () => ensureMachineryStatusSchema(pool),
      () => ensureMachineryPrerequisiteSchema(pool),
      () => ensureMachineryHostingSchema(pool),
      () => ensureMachineryInterestRateSchema(pool),
      () => ensureInterestTrackingSchema(pool),
      () => ensureGcashPaymentSchema(pool),
      () => dropUnusedActivityLogs(pool),
      () => dropUnusedLegacyTables(pool),
      () => dropUnusedMachineryBookingColumns(pool)
    ];

    let schemaFailures = 0;
    for (const step of schemaSteps) {
      try {
        await step();
      } catch (err) {
        schemaFailures += 1;
        console.error('⚠️ Startup schema step failed:', err.message);
      }
    }
    if (schemaFailures > 0) {
      console.error(
        `⚠️ ${schemaFailures} startup schema step(s) failed — production APIs may return 500 until columns/tables exist.`
      );
    }

    console.log('✅ Barangay service places schema ready (table + booking link if needed).');
    console.log('✅ Notification schema ready (due_date_notifications enums).');
    console.log('✅ Operator assignment schema ready (inventory assignment + operator_income).');
    console.log('✅ Pending expense schema ready (machinery_expenses workflow).');
    console.log('✅ Down payment schema ready (per-barangay machinery down payment).');
    console.log('✅ Balance payment & receipt schema ready.');
    console.log('✅ Refund workflow schema ready.');
    console.log('✅ Loan module schema ready (barangays.loans_enabled).');
    console.log('✅ Barangay manual income schema ready.');
    console.log('✅ Announcement views schema ready (unique per-farmer views).');
    console.log('✅ Active session schema ready (one login per account).');
    console.log('✅ Machinery inventory status ready (Available / Unavailable).');
    console.log('✅ Machinery prerequisite links ready (requires_machinery_id).');
    console.log('✅ Machinery hosting columns ready (machine_used, pricing, notes).');
    console.log('✅ Machinery interest tracking columns ready (bookings + payments).');
    console.log('✅ GCash QR inventory and payment verification schema ready.');

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
  })()
    .catch((err) => {
      console.error('⚠️ Startup schema check failed:', err.message);
    })
    .finally(() => {
      // 0.0.0.0 = reachable from phone on same Wi‑Fi via PC LAN IP
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚜 Farmer backend running on http://localhost:${PORT}`);
        console.log(`📱 LAN access: http://<your-pc-ip>:${PORT} (same Wi‑Fi as phone)`);
        console.log(`📝 Registration endpoint: http://localhost:${PORT}/api/farmers/register`);
        startNotificationScheduler();
      });
    });
} else {
  module.exports = app;
}
