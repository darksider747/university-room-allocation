/**
 * db/seed.js — Seed initial data (rooms, departments, admin user)
 * Usage: node db/seed.js
 */

import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('🌱  Starting seed...');

    // ── Rooms (52 rooms) ──────────────────────────────────────
    console.log('  📦  Seeding 52 rooms...');
    for (let i = 1; i <= 52; i++) {
      const floor = Math.floor((i - 1) / 13);
      await client.query(
        `INSERT INTO rooms (room_number, capacity, building, floor)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (room_number) DO NOTHING`,
        [`Room ${i}`, 40, 'Main Block', floor]
      );
    }

    // ── Departments ───────────────────────────────────────────
    console.log('  🏢  Seeding departments...');
    const depts = [
      'Computer Science', 'Artificial Intelligence', 'Software Engineering',
      'Electrical Engineering', 'Mechanical Engineering', 'Business Administration',
      'Mathematics', 'Physics', 'Chemistry', 'Bioinformatics',
    ];
    for (const name of depts) {
      await client.query(
        `INSERT INTO departments (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [name]
      );
    }

    // ── Admin User ────────────────────────────────────────────
    console.log('  👤  Seeding admin user...');
    const passwordHash = await bcrypt.hash('Admin@123', 12);
    await client.query(
      `INSERT INTO users (name, email, password_hash, role, department)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      ['System Admin', 'admin@uom.edu.pk', passwordHash, 'admin', 'Computer Science']
    );

    // ── Sample Student ────────────────────────────────────────
    console.log('  👤  Seeding sample student...');
    const studentHash = await bcrypt.hash('Student@123', 12);
    await client.query(
      `INSERT INTO users (name, email, password_hash, role, department)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      ['Ali Hassan', 'ali@student.uom.edu.pk', studentHash, 'student', 'Artificial Intelligence']
    );

    // ── Sample Semester ───────────────────────────────────────
    console.log('  📅  Seeding current semester...');
    await client.query(
      `INSERT INTO semesters (label, year, semester_number)
       VALUES ($1, $2, $3)
       ON CONFLICT (label) DO NOTHING`,
      ['2026-1', 2026, 1]
    );

    await client.query('COMMIT');
    console.log('✅  Seed completed!\n');
    console.log('📝  Default Credentials:');
    console.log('   Admin:   admin@uom.edu.pk  /  Admin@123');
    console.log('   Student: ali@student.uom.edu.pk  /  Student@123\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌  Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
