/**
 * controllers/allocationController.js
 */

import { query } from '../db/pool.js';
import { catchAsync } from '../utils/AppError.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/apiResponse.js';

export const getAllocations = catchAsync(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page  || '1'));
  const limit = Math.min(100, parseInt(req.query.limit || '20'));
  const offset = (page - 1) * limit;

  // Students only see their own allocations
  const isStudent = req.user.role === 'student';
  const whereClause = isStudent ? 'WHERE a.user_id = $3' : '';
  const params = isStudent ? [limit, offset, req.user.id] : [limit, offset];
  const countParams = isStudent ? [req.user.id] : [];
  const countWhere  = isStudent ? 'WHERE user_id = $1' : '';

  const [dataRes, countRes] = await Promise.all([
    query(
      `SELECT a.*, r.room_number, s.label AS semester_label, s.semester_number, s.year,
              u.name AS user_name
       FROM allocations a
       JOIN rooms     r ON r.id = a.room_id
       JOIN semesters s ON s.id = a.semester_id
       LEFT JOIN users u ON u.id = a.user_id
       ${whereClause}
       ORDER BY a.allocated_at DESC
       LIMIT $1 OFFSET $2`,
      params
    ),
    query(`SELECT COUNT(*) AS total FROM allocations ${countWhere}`, countParams),
  ]);

  return sendPaginated(res, dataRes.rows, parseInt(countRes.rows[0].total), page, limit);
});

export const getRoomSchedule = catchAsync(async (req, res) => {
  const { roomId, startDate, endDate } = req.query;

  if (!roomId || !startDate || !endDate) {
    return sendError(res, 'roomId, startDate, and endDate are required.', 400);
  }
  if (endDate < startDate) {
    return sendError(res, 'endDate must not be before startDate.', 400);
  }

  const roomCheck = await query(
    `SELECT id, room_number, capacity, building, floor FROM rooms WHERE id = $1`,
    [roomId]
  );
  if (roomCheck.rows.length === 0) {
    return sendError(res, `Room ID ${roomId} not found.`, 404);
  }

  const result = await query(
    `SELECT a.*, r.room_number, s.label AS semester_label,
            TO_CHAR(a.booking_date, 'Day') AS day_of_week,
            u.name AS user_name
     FROM allocations a
     JOIN rooms     r ON r.id = a.room_id
     JOIN semesters s ON s.id = a.semester_id
     LEFT JOIN users u ON u.id = a.user_id
     WHERE a.room_id      = $1
       AND a.booking_date >= $2
       AND a.booking_date <= $3
     ORDER BY a.booking_date ASC, a.start_time ASC`,
    [roomId, startDate, endDate]
  );

  return sendSuccess(res, { room: roomCheck.rows[0], bookings: result.rows, count: result.rows.length });
});

export const getDashboardStats = catchAsync(async (req, res) => {
  const [
    totalRooms,
    totalAllocations,
    pendingQueue,
    todayAllocations,
    usageStats,
    recentActivity,
  ] = await Promise.all([
    query(`SELECT COUNT(*) AS count FROM rooms WHERE is_active = true`),
    query(`SELECT COUNT(*) AS count FROM allocations`),
    query(`SELECT COUNT(*) AS count FROM booking_queue WHERE status = 'pending'`),
    query(`SELECT COUNT(*) AS count FROM allocations WHERE booking_date = CURRENT_DATE`),
    query(
      `SELECT department, SUM(allocated_count) AS total_bookings
       FROM department_semester_usage
       GROUP BY department
       ORDER BY total_bookings DESC
       LIMIT 10`
    ),
    query(
      `SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 10`
    ),
  ]);

  return sendSuccess(res, {
    stats: {
      totalRooms:       parseInt(totalRooms.rows[0].count),
      totalAllocations: parseInt(totalAllocations.rows[0].count),
      pendingQueue:     parseInt(pendingQueue.rows[0].count),
      todayAllocations: parseInt(todayAllocations.rows[0].count),
    },
    departmentUsage: usageStats.rows,
    recentActivity:  recentActivity.rows,
  });
});

export const getLogs = catchAsync(async (req, res) => {
  const limit = Math.min(200, parseInt(req.query.limit || '50'));
  const type  = req.query.type;

  const whereClause = type ? 'WHERE type = $2' : '';
  const params = type ? [limit, type] : [limit];

  const result = await query(
    `SELECT al.*, u.name AS user_name, u.email AS user_email
     FROM activity_logs al
     LEFT JOIN users u ON u.id = al.user_id
     ${whereClause}
     ORDER BY al.timestamp DESC
     LIMIT $1`,
    params
  );
  return sendSuccess(res, { logs: result.rows, count: result.rows.length });
});

export const getUsage = catchAsync(async (req, res) => {
  const result = await query(
    `SELECT dsu.*, s.label AS semester_label
     FROM department_semester_usage dsu
     JOIN semesters s ON s.id = dsu.semester_id
     ORDER BY dsu.department ASC, s.year ASC, s.semester_number ASC`
  );
  return sendSuccess(res, { usage: result.rows });
});
