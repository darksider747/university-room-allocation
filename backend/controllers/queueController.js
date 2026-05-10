/**
 * controllers/queueController.js
 */

import { query } from '../db/pool.js';
import { catchAsync } from '../utils/AppError.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/apiResponse.js';
import { getOrCreateSemester, logActivity } from '../services/allocationService.js';

export const addToQueue = catchAsync(async (req, res) => {
  const {
    department, semesterYear, semesterNumber,
    lectureName, date, startTime, endTime, specificRoomId, notes,
  } = req.body;

  // Validate time order
  if (endTime <= startTime) {
    return sendError(res, 'End time must be after start time.', 400);
  }

  // Validate date is not in the past
  const bookingDate = new Date(date);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (bookingDate < today) {
    return sendError(res, 'Booking date cannot be in the past.', 400);
  }

  const semesterId = await getOrCreateSemester(
    parseInt(semesterYear), parseInt(semesterNumber)
  );

  let roomId = null;
  if (specificRoomId && specificRoomId !== '') {
    roomId = parseInt(specificRoomId);
    if (isNaN(roomId)) {
      return sendError(res, 'specificRoomId must be a valid integer.', 400);
    }
    const roomCheck = await query(
      `SELECT id FROM rooms WHERE id = $1 AND is_active = true`, [roomId]
    );
    if (roomCheck.rows.length === 0) {
      return sendError(res, `Room ID ${roomId} does not exist or is inactive.`, 404);
    }
  }

  const result = await query(
    `INSERT INTO booking_queue
       (user_id, department, semester_id, lecture_name, booking_date, start_time, end_time, specific_room_id, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [req.user.id, department.trim(), semesterId, lectureName.trim(), date, startTime, endTime, roomId, notes || null]
  );

  const row = result.rows[0];
  const posRes = await query(
    `SELECT COUNT(*) AS position FROM booking_queue WHERE status='pending' AND id <= $1`,
    [row.id]
  );
  const position = parseInt(posRes.rows[0].position);

  await logActivity(`Request queued for "${lectureName}" (${department})`, 'info', req.user.id);

  return sendSuccess(res, { request: row, queuePosition: position }, 201);
});

export const getQueue = catchAsync(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page  || '1'));
  const limit = Math.min(100, parseInt(req.query.limit || '20'));
  const offset = (page - 1) * limit;

  const statusFilter = req.query.status || 'pending';

  const [dataRes, countRes] = await Promise.all([
    query(
      `SELECT bq.*, s.label AS semester_label, s.year, s.semester_number,
              r.room_number AS specific_room_number,
              u.name AS user_name, u.email AS user_email
       FROM booking_queue bq
       JOIN semesters s ON s.id = bq.semester_id
       LEFT JOIN rooms r ON r.id = bq.specific_room_id
       LEFT JOIN users u ON u.id = bq.user_id
       WHERE bq.status = $1
       ORDER BY bq.id ASC
       LIMIT $2 OFFSET $3`,
      [statusFilter, limit, offset]
    ),
    query(`SELECT COUNT(*) AS total FROM booking_queue WHERE status = $1`, [statusFilter]),
  ]);

  return sendPaginated(res, dataRes.rows, parseInt(countRes.rows[0].total), page, limit);
});

export const deleteQueueItem = catchAsync(async (req, res) => {
  const { id } = req.params;

  const item = await query(
    `SELECT * FROM booking_queue WHERE id = $1`, [id]
  );
  if (item.rows.length === 0) {
    return sendError(res, 'Queue item not found.', 404);
  }

  // Students can only delete their own pending items
  if (req.user.role !== 'admin' && item.rows[0].user_id !== req.user.id) {
    return sendError(res, 'You can only cancel your own bookings.', 403);
  }
  if (item.rows[0].status !== 'pending') {
    return sendError(res, 'Only pending requests can be cancelled.', 400);
  }

  await query(`DELETE FROM booking_queue WHERE id = $1`, [id]);
  return sendSuccess(res, { message: 'Booking request cancelled.' });
});
