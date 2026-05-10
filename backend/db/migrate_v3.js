/**
 * db/migrate_v3.js — Run v3 incremental migration
 * Usage: node db/migrate_v3.js
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function migrate() {
  const client = await pool.connect();
  try {
    const sql = readFileSync(join(__dirname, 'migrate_v3.sql'), 'utf8');
    console.log('🔄  Running v3 migration (HOD + Notifications + Timetable)...');
    await client.query(sql);
    console.log('✅  v3 Migration completed!\n');
    console.log('📝  New tables: timetable_entries, timetable_changes, notifications,');
    console.log('               faculty_preferences, student_sections');
    console.log('📝  Updated:   users.role (added hod, faculty, super_admin)');
    console.log('               rooms (room_type, has_projector, has_ac, lab_type)');
    console.log('               departments (code, hod_user_id)\n');
    console.log('⚠️   NOTE: Existing "admin" role users are now "super_admin".');
    console.log('   Run: node db/seed_v3.js   to add sample HOD/faculty/student data.\n');
  } catch (err) {
    console.error('❌  Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
