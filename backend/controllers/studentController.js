/**
 * controllers/studentController.js
 */

import { query } from '../db/pool.js';
import { catchAsync } from '../utils/AppError.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

// GET /student/timetable — student's published timetable
export const getMyTimetable = catchAsync(async (req, res) => {
  // Find student's sections
  const sections = await query(
    `SELECT ss.*, d.name AS dept_name, s.label AS semester_label
     FROM student_sections ss
     JOIN departments d ON d.id = ss.department_id
     JOIN semesters   s ON s.id = ss.semester_id
     WHERE ss.student_id = $1`,
    [req.user.id]
  );

  if (sections.rows.length === 0) {
    return sendSuccess(res, {
      timetable: [],
      message: 'You are not enrolled in any section yet. Contact your department HOD.',
    });
  }

  // Get published timetable for all student's sections
  const timetable = [];
  for (const enrollment of sections.rows) {
    const entries = await query(
      `SELECT te.*,
              r.room_number, r.building, r.floor, r.room_type,
              r.has_projector, r.has_ac,
              u.name AS faculty_name,
              d.name AS department_name,
              s.label AS semester_label
       FROM timetable_entries te
       LEFT JOIN rooms       r ON r.id = te.room_id
       LEFT JOIN users       u ON u.id = te.faculty_id
       JOIN departments      d ON d.id = te.department_id
       JOIN semesters        s ON s.id = te.semester_id
       WHERE te.department_id = $1
         AND te.semester_id   = $2
         AND te.section       = $3
         AND te.status        = 'published'
       ORDER BY te.day_of_week ASC, te.start_time ASC`,
      [enrollment.department_id, enrollment.semester_id, enrollment.section]
    );
    timetable.push({
      enrollment,
      entries: entries.rows,
    });
  }

  return sendSuccess(res, { timetable, sections: sections.rows });
});

// GET /student/enrollments — list enrollments
export const getEnrollments = catchAsync(async (req, res) => {
  const result = await query(
    `SELECT ss.*, d.name AS dept_name, s.label AS sem_label
     FROM student_sections ss
     JOIN departments d ON d.id = ss.department_id
     JOIN semesters   s ON s.id = ss.semester_id
     WHERE ss.student_id = $1`,
    [req.user.id]
  );
  return sendSuccess(res, { enrollments: result.rows });
});

// POST /student/enroll — self-enroll (or admin can enroll students)
export const enroll = catchAsync(async (req, res) => {
  const { departmentId, semesterId, section } = req.body;

  const deptCheck = await query(`SELECT id FROM departments WHERE id = $1`, [departmentId]);
  if (deptCheck.rows.length === 0) return sendError(res, 'Department not found.', 404);

  const existing = await query(
    `SELECT id FROM student_sections
     WHERE student_id = $1 AND department_id = $2 AND semester_id = $3`,
    [req.user.id, departmentId, semesterId]
  );
  if (existing.rows.length > 0) {
    return sendError(res, 'Already enrolled in this department/semester.', 409);
  }

  const result = await query(
    `INSERT INTO student_sections (student_id, department_id, semester_id, section)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [req.user.id, departmentId, semesterId, section || 'A']
  );

  return sendSuccess(res, { enrollment: result.rows[0] }, 201);
});
