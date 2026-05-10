/**
 * controllers/hodController.js
 * All HOD workflow: timetable management, room allocation, approvals.
 */

import { query, getClient } from '../db/pool.js';
import { catchAsync } from '../utils/AppError.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { logActivity } from '../services/allocationService.js';
import {
  notifyRoomAssigned, notifyRoomChanged,
  notifyTimetablePublished, notifyClassCancelled, notifyClassRescheduled,
} from '../services/notificationService.js';
import { getRecommendations } from '../services/aiRecommendationService.js';

// ── Helper: get HOD's department ──────────────────────────────
async function getHodDepartment(userId) {
  const res = await query(
    `SELECT d.* FROM departments d
     JOIN users u ON u.department = d.name
     WHERE u.id = $1 AND d.hod_user_id = $1`,
    [userId]
  );
  return res.rows[0] || null;
}

// ── Helper: assert HOD owns this entry ────────────────────────
async function assertOwnership(hodUserId, entryId) {
  const res = await query(
    `SELECT te.id FROM timetable_entries te
     JOIN departments d ON d.id = te.department_id
     WHERE te.id = $1 AND d.hod_user_id = $2`,
    [entryId, hodUserId]
  );
  return res.rows.length > 0;
}

// ── GET /hod/department — current HOD's department info ───────
export const getMyDepartment = catchAsync(async (req, res) => {
  const dept = await getHodDepartment(req.user.id);
  if (!dept) return sendError(res, 'No department assigned to your HOD account.', 404);

  // Fetch faculty list
  const faculty = await query(
    `SELECT id, name, email FROM users WHERE department = $1 AND role = 'faculty' AND is_active = true ORDER BY name`,
    [dept.name]
  );

  // Fetch students enrolled
  const students = await query(
    `SELECT COUNT(*) AS count FROM student_sections WHERE department_id = $1`,
    [dept.id]
  );

  return sendSuccess(res, {
    department: dept,
    faculty: faculty.rows,
    studentCount: parseInt(students.rows[0].count),
  });
});

// ── GET /hod/timetable — list all entries for HOD's department ──
export const getTimetable = catchAsync(async (req, res) => {
  const dept = await getHodDepartment(req.user.id);
  if (!dept) return sendError(res, 'No department assigned.', 404);

  const { semesterId, status, section } = req.query;

  let whereExtra = '';
  const params = [dept.id];
  if (semesterId) { params.push(semesterId); whereExtra += ` AND te.semester_id = $${params.length}`; }
  if (status)     { params.push(status);     whereExtra += ` AND te.status = $${params.length}`; }
  if (section)    { params.push(section);    whereExtra += ` AND te.section = $${params.length}`; }

  const result = await query(
    `SELECT te.*,
            r.room_number, r.room_type, r.capacity, r.building, r.floor,
            u.name  AS faculty_name, u.email AS faculty_email,
            s.label AS semester_label
     FROM timetable_entries te
     LEFT JOIN rooms     r ON r.id = te.room_id
     LEFT JOIN users     u ON u.id = te.faculty_id
     LEFT JOIN semesters s ON s.id = te.semester_id
     WHERE te.department_id = $1 ${whereExtra}
     ORDER BY te.day_of_week ASC, te.start_time ASC`,
    params
  );

  return sendSuccess(res, { entries: result.rows, count: result.rows.length, department: dept });
});

// ── POST /hod/timetable — create a timetable entry ───────────
export const createTimetableEntry = catchAsync(async (req, res) => {
  const dept = await getHodDepartment(req.user.id);
  if (!dept) return sendError(res, 'No department assigned.', 404);

  const {
    semesterId, roomId, facultyId, subjectName, section,
    dayOfWeek, startTime, endTime, notes, isRecurring,
    effectiveFrom, effectiveTo,
  } = req.body;

  // Conflict check on timetable_entries
  const conflict = await query(
    `SELECT te.id, te.subject_name, u.name AS faculty_name FROM timetable_entries te
     LEFT JOIN users u ON u.id = te.faculty_id
     WHERE te.room_id = $1 AND te.day_of_week = $2
       AND te.status IN ('approved','published','draft')
       AND NOT (te.end_time <= $3 OR $4 <= te.start_time)`,
    [roomId, dayOfWeek, startTime, endTime]
  );

  if (conflict.rows.length > 0) {
    return sendError(res, `Room conflict: already booked for "${conflict.rows[0].subject_name}" at this time.`, 409);
  }

  const result = await query(
    `INSERT INTO timetable_entries
       (department_id, semester_id, room_id, faculty_id, subject_name, section,
        day_of_week, start_time, end_time, status, notes, is_recurring,
        effective_from, effective_to, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft',$10,$11,$12,$13,$14)
     RETURNING *`,
    [
      dept.id, semesterId, roomId || null, facultyId || null,
      subjectName, section, dayOfWeek, startTime, endTime,
      notes || null, isRecurring !== false,
      effectiveFrom || new Date().toISOString().split('T')[0],
      effectiveTo || null, req.user.id,
    ]
  );

  const entry = result.rows[0];

  // Log change
  await query(
    `INSERT INTO timetable_changes (entry_id, changed_by, change_type, new_values)
     VALUES ($1, $2, 'created', $3)`,
    [entry.id, req.user.id, JSON.stringify(req.body)]
  );

  await logActivity(`HOD created timetable entry: ${subjectName} (${section})`, 'info', req.user.id);

  return sendSuccess(res, { entry }, 201);
});

// ── PATCH /hod/timetable/:id/room — assign / change room ──────
export const assignRoom = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { roomId, reason } = req.body;

  if (!(await assertOwnership(req.user.id, id))) {
    return sendError(res, 'Access denied: not your department.', 403);
  }

  const entryRes = await query(
    `SELECT te.*, r.room_number, r.capacity,
            d.id AS dept_id, s.id AS sem_id
     FROM timetable_entries te
     LEFT JOIN rooms r ON r.id = te.room_id
     JOIN departments d ON d.id = te.department_id
     JOIN semesters   s ON s.id = te.semester_id
     WHERE te.id = $1`,
    [id]
  );
  if (entryRes.rows.length === 0) return sendError(res, 'Entry not found.', 404);
  const entry = entryRes.rows[0];

  // Conflict check (exclude current entry)
  const conflict = await query(
    `SELECT id FROM timetable_entries
     WHERE room_id = $1 AND day_of_week = $2
       AND status IN ('approved','published','draft')
       AND id != $3
       AND NOT (end_time <= $4 OR $5 <= start_time)`,
    [roomId, entry.day_of_week, id, entry.start_time, entry.end_time]
  );
  if (conflict.rows.length > 0) {
    return sendError(res, 'Room conflict: that room is already booked at this time.', 409);
  }

  // Get new room info
  const roomRes = await query(`SELECT * FROM rooms WHERE id = $1`, [roomId]);
  if (roomRes.rows.length === 0) return sendError(res, 'Room not found.', 404);
  const newRoom = roomRes.rows[0];

  const oldRoomNumber = entry.room_number || 'Unassigned';

  await query(`UPDATE timetable_entries SET room_id = $1, updated_at = NOW() WHERE id = $2`, [roomId, id]);

  // Log change
  await query(
    `INSERT INTO timetable_changes (entry_id, changed_by, change_type, old_values, new_values, reason)
     VALUES ($1, $2, 'room_changed', $3, $4, $5)`,
    [id, req.user.id,
      JSON.stringify({ room_id: entry.room_id, room_number: oldRoomNumber }),
      JSON.stringify({ room_id: roomId, room_number: newRoom.room_number }),
      reason || null,
    ]
  );

  // Notify students
  await notifyRoomChanged({
    entry: { ...entry, room_id: roomId },
    oldRoom: oldRoomNumber,
    newRoom: newRoom.room_number,
    departmentId: entry.dept_id,
    semesterId: entry.sem_id,
  });

  await logActivity(`Room changed for "${entry.subject_name}": ${oldRoomNumber} → ${newRoom.room_number}`, 'info', req.user.id);

  return sendSuccess(res, { message: 'Room assigned.', entry: { ...entry, room_id: roomId, room_number: newRoom.room_number } });
});

// ── PATCH /hod/timetable/:id/approve ─────────────────────────
export const approveEntry = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!(await assertOwnership(req.user.id, id))) {
    return sendError(res, 'Access denied.', 403);
  }

  const entryRes = await query(`SELECT * FROM timetable_entries WHERE id = $1`, [id]);
  if (entryRes.rows.length === 0) return sendError(res, 'Entry not found.', 404);

  if (!entryRes.rows[0].room_id) {
    return sendError(res, 'Cannot approve entry without a room assigned.', 400);
  }

  await query(
    `UPDATE timetable_entries SET status = 'approved', updated_at = NOW() WHERE id = $1`, [id]
  );

  await query(
    `INSERT INTO timetable_changes (entry_id, changed_by, change_type)
     VALUES ($1, $2, 'approved')`,
    [id, req.user.id]
  );

  return sendSuccess(res, { message: 'Entry approved.' });
});

// ── PATCH /hod/timetable/:id/publish ──────────────────────────
export const publishTimetable = catchAsync(async (req, res) => {
  const dept = await getHodDepartment(req.user.id);
  if (!dept) return sendError(res, 'No department assigned.', 404);

  const { semesterId } = req.body;

  // Publish all approved entries for this semester
  const result = await query(
    `UPDATE timetable_entries SET status = 'published', updated_at = NOW()
     WHERE department_id = $1 AND semester_id = $2 AND status = 'approved'
     RETURNING id`,
    [dept.id, semesterId]
  );

  await query(
    `INSERT INTO timetable_changes (entry_id, changed_by, change_type)
     SELECT id, $1, 'published' FROM timetable_entries
     WHERE department_id = $2 AND semester_id = $3 AND status = 'published'`,
    [req.user.id, dept.id, semesterId]
  );

  // Notify all students in department
  await notifyTimetablePublished({ departmentId: dept.id, semesterId, publishedBy: req.user.name });

  await logActivity(`Timetable published for ${dept.name} (semester ${semesterId})`, 'success', req.user.id);

  return sendSuccess(res, {
    message: `Timetable published. ${result.rowCount} entries made live.`,
    published: result.rowCount,
  });
});

// ── PATCH /hod/timetable/:id/cancel ──────────────────────────
export const cancelEntry = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!(await assertOwnership(req.user.id, id))) {
    return sendError(res, 'Access denied.', 403);
  }

  const entryRes = await query(
    `SELECT te.*, d.id AS dept_id, s.id AS sem_id
     FROM timetable_entries te
     JOIN departments d ON d.id = te.department_id
     JOIN semesters s ON s.id = te.semester_id
     WHERE te.id = $1`,
    [id]
  );
  if (entryRes.rows.length === 0) return sendError(res, 'Entry not found.', 404);
  const entry = entryRes.rows[0];

  await query(
    `UPDATE timetable_entries SET status = 'cancelled', updated_at = NOW() WHERE id = $1`, [id]
  );

  await notifyClassCancelled({ entry, departmentId: entry.dept_id, semesterId: entry.sem_id, reason });

  return sendSuccess(res, { message: 'Entry cancelled and students notified.' });
});

// ── DELETE /hod/timetable/:id ─────────────────────────────────
export const deleteEntry = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!(await assertOwnership(req.user.id, id))) return sendError(res, 'Access denied.', 403);

  await query(`DELETE FROM timetable_entries WHERE id = $1 AND status = 'draft'`, [id]);
  return sendSuccess(res, { message: 'Draft entry deleted.' });
});

// ── GET /hod/ai-recommend — AI room recommendations ───────────
export const getAiRecommendations = catchAsync(async (req, res) => {
  const { studentStrength, requiredType, labType, dayOfWeek, startTime, endTime, facultyId, excludeEntryId } = req.query;

  if (dayOfWeek === undefined || !startTime || !endTime) {
    return sendError(res, 'dayOfWeek, startTime, and endTime are required.', 400);
  }

  const recommendations = await getRecommendations({
    studentStrength: parseInt(studentStrength) || 40,
    requiredType:    requiredType || 'classroom',
    labType:         labType || null,
    dayOfWeek:       parseInt(dayOfWeek),
    startTime,
    endTime,
    facultyId:       facultyId ? parseInt(facultyId) : null,
    excludeEntryId:  excludeEntryId ? parseInt(excludeEntryId) : null,
  });

  return sendSuccess(res, { recommendations, count: recommendations.length });
});

// ── GET /hod/analytics ─────────────────────────────────────────
export const getAnalytics = catchAsync(async (req, res) => {
  const dept = await getHodDepartment(req.user.id);
  if (!dept) return sendError(res, 'No department assigned.', 404);

  const [
    totalEntries, publishedEntries, draftEntries,
    roomUsage, facultyLoad, conflictCount, topRooms,
  ] = await Promise.all([
    query(`SELECT COUNT(*) AS count FROM timetable_entries WHERE department_id = $1`, [dept.id]),
    query(`SELECT COUNT(*) AS count FROM timetable_entries WHERE department_id = $1 AND status = 'published'`, [dept.id]),
    query(`SELECT COUNT(*) AS count FROM timetable_entries WHERE department_id = $1 AND status = 'draft'`, [dept.id]),

    // Room utilization
    query(`
      SELECT r.room_number, r.room_type, COUNT(te.id) AS usage_count
      FROM timetable_entries te
      JOIN rooms r ON r.id = te.room_id
      WHERE te.department_id = $1 AND te.status IN ('approved','published')
      GROUP BY r.id, r.room_number, r.room_type
      ORDER BY usage_count DESC LIMIT 8
    `, [dept.id]),

    // Faculty workload
    query(`
      SELECT u.name, u.email, COUNT(te.id) AS classes_count
      FROM timetable_entries te
      JOIN users u ON u.id = te.faculty_id
      WHERE te.department_id = $1 AND te.status IN ('approved','published')
      GROUP BY u.id, u.name, u.email
      ORDER BY classes_count DESC
    `, [dept.id]),

    // Scheduling conflicts (drafts that have conflicting rooms)
    query(`
      SELECT COUNT(*) AS count
      FROM timetable_entries te1
      WHERE te1.department_id = $1
        AND EXISTS (
          SELECT 1 FROM timetable_entries te2
          WHERE te2.room_id = te1.room_id
            AND te2.day_of_week = te1.day_of_week
            AND te2.id != te1.id
            AND NOT (te2.end_time <= te1.start_time OR te1.end_time <= te2.start_time)
        )
    `, [dept.id]),

    // Top 5 most used rooms
    query(`
      SELECT r.room_number, r.building, COUNT(te.id) AS bookings
      FROM timetable_entries te
      JOIN rooms r ON r.id = te.room_id
      WHERE te.department_id = $1
      GROUP BY r.id, r.room_number, r.building
      ORDER BY bookings DESC LIMIT 5
    `, [dept.id]),
  ]);

  return sendSuccess(res, {
    department: dept,
    stats: {
      total:     parseInt(totalEntries.rows[0].count),
      published: parseInt(publishedEntries.rows[0].count),
      drafts:    parseInt(draftEntries.rows[0].count),
      conflicts: parseInt(conflictCount.rows[0].count),
    },
    roomUtilization: roomUsage.rows,
    facultyWorkload: facultyLoad.rows,
    topRooms:        topRooms.rows,
  });
});

// ── GET /hod/timetable/:id/changes — audit trail ──────────────
export const getEntryChanges = catchAsync(async (req, res) => {
  if (!(await assertOwnership(req.user.id, req.params.id))) {
    return sendError(res, 'Access denied.', 403);
  }

  const result = await query(
    `SELECT tc.*, u.name AS changed_by_name
     FROM timetable_changes tc
     LEFT JOIN users u ON u.id = tc.changed_by
     WHERE tc.entry_id = $1
     ORDER BY tc.changed_at DESC`,
    [req.params.id]
  );

  return sendSuccess(res, { changes: result.rows });
});
