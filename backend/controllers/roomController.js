/**
 * controllers/roomController.js
 */

import { query } from '../db/pool.js';
import { catchAsync } from '../utils/AppError.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export const getRooms = catchAsync(async (req, res) => {
  const result = await query(
    `SELECT * FROM rooms WHERE is_active = true ORDER BY id ASC`
  );
  return sendSuccess(res, { rooms: result.rows, count: result.rows.length });
});

export const getRoomById = catchAsync(async (req, res) => {
  const result = await query(
    `SELECT * FROM rooms WHERE id = $1`, [req.params.id]
  );
  if (result.rows.length === 0) {
    return sendError(res, 'Room not found.', 404);
  }
  return sendSuccess(res, { room: result.rows[0] });
});

export const createRoom = catchAsync(async (req, res) => {
  const { roomNumber, capacity, building, floor } = req.body;
  const result = await query(
    `INSERT INTO rooms (room_number, capacity, building, floor)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [roomNumber, capacity, building || 'Main Block', floor || 0]
  );
  return sendSuccess(res, { room: result.rows[0] }, 201);
});

export const updateRoom = catchAsync(async (req, res) => {
  const { capacity, building, floor, isActive } = req.body;
  const result = await query(
    `UPDATE rooms
     SET capacity  = COALESCE($1, capacity),
         building  = COALESCE($2, building),
         floor     = COALESCE($3, floor),
         is_active = COALESCE($4, is_active)
     WHERE id = $5
     RETURNING *`,
    [capacity, building, floor, isActive, req.params.id]
  );
  if (result.rows.length === 0) {
    return sendError(res, 'Room not found.', 404);
  }
  return sendSuccess(res, { room: result.rows[0] });
});
