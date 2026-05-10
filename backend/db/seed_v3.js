/**
 * db/seed_v3.js — Seed HOD, faculty, students and departments for v3
 * Usage: node db/seed_v3.js
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
    console.log('🌱  Starting v3 seed...');

    const hash = (pw) => bcrypt.hash(pw, 12);

    // ── Ensure super_admin exists ──────────────────────────────
    await client.query(`
      INSERT INTO users (name, email, password_hash, role, department)
      VALUES ('Super Admin','superadmin@uom.edu.pk', $1, 'super_admin', 'Administration')
      ON CONFLICT (email) DO UPDATE SET role = 'super_admin'
    `, [await hash('Admin@123')]);

    // ── Departments ────────────────────────────────────────────
    const deptRows = [];
    const depts = [
      { name: 'Computer Science',        code: 'CS'  },
      { name: 'Artificial Intelligence', code: 'AI'  },
      { name: 'Software Engineering',    code: 'SE'  },
      { name: 'Electrical Engineering',  code: 'EE'  },
    ];

    for (const d of depts) {
      const r = await client.query(`
        INSERT INTO departments (name, code)
        VALUES ($1, $2)
        ON CONFLICT (name) DO UPDATE SET code = EXCLUDED.code
        RETURNING id, name, code
      `, [d.name, d.code]);
      deptRows.push(r.rows[0]);
    }

    const csDept = deptRows.find((d) => d.code === 'CS');
    const aiDept = deptRows.find((d) => d.code === 'AI');

    // ── HOD Users ──────────────────────────────────────────────
    const hodCS = await client.query(`
      INSERT INTO users (name, email, password_hash, role, department)
      VALUES ('Dr. Ahmed Raza','hod.cs@uom.edu.pk', $1, 'hod', 'Computer Science')
      ON CONFLICT (email) DO UPDATE SET role = 'hod'
      RETURNING id
    `, [await hash('Hod@1234')]);

    const hodAI = await client.query(`
      INSERT INTO users (name, email, password_hash, role, department)
      VALUES ('Dr. Sara Malik','hod.ai@uom.edu.pk', $1, 'hod', 'Artificial Intelligence')
      ON CONFLICT (email) DO UPDATE SET role = 'hod'
      RETURNING id
    `, [await hash('Hod@1234')]);

    // Link HODs to departments
    await client.query(
      `UPDATE departments SET hod_user_id = $1 WHERE id = $2`,
      [hodCS.rows[0].id, csDept.id]
    );
    await client.query(
      `UPDATE departments SET hod_user_id = $1 WHERE id = $2`,
      [hodAI.rows[0].id, aiDept.id]
    );

    // ── Faculty ────────────────────────────────────────────────
    const faculty1 = await client.query(`
      INSERT INTO users (name, email, password_hash, role, department)
      VALUES ('Prof. Usman Khan','faculty.cs1@uom.edu.pk', $1, 'faculty', 'Computer Science')
      ON CONFLICT (email) DO UPDATE SET role = 'faculty'
      RETURNING id
    `, [await hash('Faculty@123')]);

    const faculty2 = await client.query(`
      INSERT INTO users (name, email, password_hash, role, department)
      VALUES ('Ms. Ayesha Tariq','faculty.cs2@uom.edu.pk', $1, 'faculty', 'Computer Science')
      ON CONFLICT (email) DO UPDATE SET role = 'faculty'
      RETURNING id
    `, [await hash('Faculty@123')]);

    // ── Students ───────────────────────────────────────────────
    const students = [
      ['Bilal Ahmed',   'bilal@student.uom.edu.pk'],
      ['Fatima Noor',   'fatima@student.uom.edu.pk'],
      ['Hassan Ali',    'hassan@student.uom.edu.pk'],
    ];

    const studentIds = [];
    for (const [name, email] of students) {
      const r = await client.query(`
        INSERT INTO users (name, email, password_hash, role, department)
        VALUES ($1, $2, $3, 'student', 'Computer Science')
        ON CONFLICT (email) DO UPDATE SET role = 'student'
        RETURNING id
      `, [name, email, await hash('Student@123')]);
      studentIds.push(r.rows[0].id);
    }

    // ── Semester ───────────────────────────────────────────────
    const semRes = await client.query(`
      INSERT INTO semesters (label, year, semester_number)
      VALUES ('2026-1', 2026, 1)
      ON CONFLICT (label) DO UPDATE SET label = EXCLUDED.label
      RETURNING id
    `);
    const semId = semRes.rows[0].id;

    // ── Student section enrollment ─────────────────────────────
    for (const sid of studentIds) {
      await client.query(`
        INSERT INTO student_sections (student_id, department_id, semester_id, section)
        VALUES ($1, $2, $3, 'CS-5A')
        ON CONFLICT (student_id, department_id, semester_id) DO NOTHING
      `, [sid, csDept.id, semId]);
    }

    // ── Update rooms with new type fields ─────────────────────
    await client.query(`UPDATE rooms SET room_type='lab', has_projector=true, lab_type='CS Lab' WHERE room_number IN ('Room 1','Room 2','Room 3','Room 4')`);
    await client.query(`UPDATE rooms SET room_type='smart', has_projector=true, has_ac=true WHERE room_number IN ('Room 5','Room 6','Room 7')`);
    await client.query(`UPDATE rooms SET room_type='seminar', has_projector=true, has_ac=true, capacity=80 WHERE room_number = 'Room 8'`);

    // ── Sample timetable entries (drafts) ─────────────────────
    const room1 = await client.query(`SELECT id FROM rooms WHERE room_number = 'Room 9' LIMIT 1`);
    const room2 = await client.query(`SELECT id FROM rooms WHERE room_number = 'Room 10' LIMIT 1`);
    if (room1.rows.length && room2.rows.length) {
      const r1 = room1.rows[0].id;
      const r2 = room2.rows[0].id;
      const f1 = faculty1.rows[0].id;
      const f2 = faculty2.rows[0].id;
      const hod = hodCS.rows[0].id;

      const entries = [
        [csDept.id, semId, r1, f1, 'Data Structures',     'CS-5A', 0, '08:00', '10:00', 'draft'],
        [csDept.id, semId, r2, f2, 'Operating Systems',   'CS-5A', 1, '10:00', '12:00', 'draft'],
        [csDept.id, semId, r1, f1, 'Data Structures',     'CS-5B', 0, '14:00', '16:00', 'approved'],
        [csDept.id, semId, r2, f2, 'Database Systems',    'CS-5A', 2, '08:00', '10:00', 'published'],
        [csDept.id, semId, r1, f1, 'Algorithms',          'CS-5A', 3, '10:00', '12:00', 'published'],
      ];

      for (const [did, sid2, rid, fid, subj, sect, day, st, et, status] of entries) {
        await client.query(`
          INSERT INTO timetable_entries
            (department_id, semester_id, room_id, faculty_id, subject_name, section, day_of_week, start_time, end_time, status, created_by)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
          ON CONFLICT DO NOTHING
        `, [did, sid2, rid, fid, subj, sect, day, st, et, status, hod]);
      }
    }

    await client.query('COMMIT');
    console.log('✅  v3 Seed completed!\n');
    console.log('📝  Credentials:');
    console.log('   Super Admin:  superadmin@uom.edu.pk  /  Admin@123');
    console.log('   HOD (CS):     hod.cs@uom.edu.pk      /  Hod@1234');
    console.log('   HOD (AI):     hod.ai@uom.edu.pk      /  Hod@1234');
    console.log('   Faculty:      faculty.cs1@uom.edu.pk /  Faculty@123');
    console.log('   Student:      bilal@student.uom.edu.pk / Student@123\n');
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
