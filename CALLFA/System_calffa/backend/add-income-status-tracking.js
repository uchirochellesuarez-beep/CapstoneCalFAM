// Migration: Add status tracking to farmer income records
// Run: node add-income-status-tracking.js

const pool = require('./db');

async function migrate() {
  const conn = await pool.getConnection();
  try {
    console.log('🌾 Adding status tracking to farmer income...\n');

    // Step 1: Add status column to farmer_income_records if it doesn't exist
    try {
      await conn.execute(`
        ALTER TABLE farmer_income_records 
        ADD COLUMN status ENUM('Submitted', 'Under Review', 'Eligible', 'Upcoming Assistance', 'Received') DEFAULT 'Submitted' NOT NULL
      `);
      console.log('✅ Added status column to farmer_income_records');
    } catch (err) {
      if (err.message.includes('Duplicate column')) {
        console.log('⚠️ Status column already exists');
      } else {
        throw err;
      }
    }

    // Step 2: Add reviewed_by and reviewed_at columns for audit trail if they don't exist
    try {
      await conn.execute(`
        ALTER TABLE farmer_income_records 
        ADD COLUMN reviewed_by INT UNSIGNED,
        ADD COLUMN reviewed_at TIMESTAMP NULL,
        ADD FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
      `);
      console.log('✅ Added reviewed_by and reviewed_at columns');
    } catch (err) {
      if (err.message.includes('Duplicate column')) {
        console.log('⚠️ Review columns already exist');
      } else {
        throw err;
      }
    }

    // Step 3: Create assistance distribution table
    try {
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS income_assistance_distributions (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          income_record_id INT UNSIGNED NOT NULL,
          farmer_id INT UNSIGNED NOT NULL,
          barangay_id INT UNSIGNED NOT NULL,
          assistance_type ENUM('fertilizer', 'seeds', 'both') NOT NULL,
          quantity INT DEFAULT 0,
          unit VARCHAR(50),
          status ENUM('Pending', 'Ready for Distribution', 'Distributed', 'Confirmed Received') DEFAULT 'Pending' NOT NULL,
          sms_status ENUM('pending', 'sent', 'failed', 'not_configured') DEFAULT 'pending' NOT NULL,
          sms_provider VARCHAR(50) NULL,
          sms_recipient VARCHAR(20) NULL,
          sms_message TEXT NULL,
          sms_last_attempt_at TIMESTAMP NULL,
          sms_sent_at TIMESTAMP NULL,
          sms_failure_reason TEXT NULL,
          sms_attempt_count INT UNSIGNED DEFAULT 0 NOT NULL,
          created_by INT UNSIGNED NOT NULL,
          distribution_date TIMESTAMP NULL,
          received_date TIMESTAMP NULL,
          confirmed_by INT UNSIGNED,
          confirmed_at TIMESTAMP NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

          FOREIGN KEY (income_record_id) REFERENCES farmer_income_records(id) ON DELETE CASCADE,
          FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE CASCADE,
          FOREIGN KEY (barangay_id) REFERENCES barangays(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
          FOREIGN KEY (confirmed_by) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('✅ income_assistance_distributions table created');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('⚠️ income_assistance_distributions table already exists');
      } else {
        throw err;
      }
    }

    // Step 4: Add SMS tracking columns for existing income_assistance_distributions tables
    const smsColumns = [
      ["sms_status", "ALTER TABLE income_assistance_distributions ADD COLUMN sms_status ENUM('pending', 'sent', 'failed', 'not_configured') DEFAULT 'pending' NOT NULL"],
      ["sms_provider", "ALTER TABLE income_assistance_distributions ADD COLUMN sms_provider VARCHAR(50) NULL"],
      ["sms_recipient", "ALTER TABLE income_assistance_distributions ADD COLUMN sms_recipient VARCHAR(20) NULL"],
      ["sms_message", "ALTER TABLE income_assistance_distributions ADD COLUMN sms_message TEXT NULL"],
      ["sms_last_attempt_at", "ALTER TABLE income_assistance_distributions ADD COLUMN sms_last_attempt_at TIMESTAMP NULL"],
      ["sms_sent_at", "ALTER TABLE income_assistance_distributions ADD COLUMN sms_sent_at TIMESTAMP NULL"],
      ["sms_failure_reason", "ALTER TABLE income_assistance_distributions ADD COLUMN sms_failure_reason TEXT NULL"],
      ["sms_attempt_count", "ALTER TABLE income_assistance_distributions ADD COLUMN sms_attempt_count INT UNSIGNED DEFAULT 0 NOT NULL"]
    ];

    for (const [columnName, sql] of smsColumns) {
      try {
        await conn.execute(sql);
        console.log(`✅ Added ${columnName} to income_assistance_distributions`);
      } catch (err) {
        if (err.message.includes('Duplicate column')) {
          console.log(`⚠️ ${columnName} already exists`);
        } else {
          throw err;
        }
      }
    }

    // Step 5: Create audit log table for tracking status changes
    try {
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS income_status_audit_log (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          income_record_id INT UNSIGNED NOT NULL,
          farmer_id INT UNSIGNED NOT NULL,
          old_status VARCHAR(50),
          new_status VARCHAR(50) NOT NULL,
          changed_by INT UNSIGNED NOT NULL,
          reason_notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

          FOREIGN KEY (income_record_id) REFERENCES farmer_income_records(id) ON DELETE CASCADE,
          FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE CASCADE,
          FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('✅ income_status_audit_log table created');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('⚠️ income_status_audit_log table already exists');
      } else {
        throw err;
      }
    }

    console.log('\n🎉 Status tracking migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    conn.release();
    process.exit(0);
  }
}

migrate();
