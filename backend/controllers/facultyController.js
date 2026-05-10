/**
 * controllers/facultyController.js
 */

import { query } from '../db/pool.js';
import { catchAsync } from '../utils/AppError.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

// GET /faculty/schedule — faculty's assigned timetable
export const getMySchedule = catchAsync(async (req, res) => {
  const result = await query(
    `SELECT te.*,
            r.room_number, r.building, r.floor, r.room_type, r.capacity,
            d.name AS department_name,
            s.label AS semester_label
     FROM timetable_entries te
     LEFT JOIN rooms       r ON r.id = te.room_id
     JOIN departments      d ON d.id = te.department_id
     JOIN semesters        s ON s.id = te.semester_id
     WHERE te.faculty_id = $1 AND te.status IN ('approved','published')
     ORDER BY te.day_of_week ASC, te.start_time ASC`,
    [req.user.id]
  );
  return sendSuccess(res, { schedule: result.rows, count: result.rows.length });
});

// GET /faculty/preferences — get own availability settings
export const getPreferences = catchAsync(async (req, res) => {
  const result = await query(
    `SELECT * FROM faculty_preferences WHERE faculty_id = $1 ORDER BY day_of_week, start_time`,
    [req.user.id]
  );
  return sendSuccess(res, { preferences: result.rows });
});

// POST /faculty/preferences — upsert a preference slot
export const setPreference = catchAsync(async (req, res) => {
  const { dayOfWeek, startTime, endTime, preference, reason } = req.body;

  if (!['available', 'preferred', 'unavailable'].includes(preference)) {
    return sendError(res, 'Invalid preference value.', 400);
  }

  const result = await query(
    `INSERT INTO faculty_preferences (faculty_id, day_of_week, start_time, end_time, preference, reason)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (faculty_id, day_of_week, start_time, end_time)
     DO UPDATE SET preference = EXCLUDED.preference, reason = EXCLUDED.reason
     RETURNING *`,
    [req.user.id, dayOfWeek, startTime, endTime, preference, reason || null]
  );

  return sendSuccess(res, { preference: result.rows[0] }, 201);
});

// DELETE /faculty/preferences/:id
export const deletePreference = catchAsync(async (req, res) => {
  await query(
    `DELETE FROM faculty_preferences WHERE id = $1 AND faculty_id = $2`,
    [req.params.id, req.user.id]
  );
  return sendSuccess(res, { message: 'Preference removed.' });
});
