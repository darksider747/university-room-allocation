/**
 * services/allocationService.js
 * Core FIFO room allocation business logic
 */

import { query, getClient } from '../db/pool.js';
import logger from '../utils/logger.js';

// ── Helpers ───────────────────────────────────────────────────

export async function logActivity(message, type = 'info', userId = null, metadata = null) {
  try {
    await query(
      `INSERT INTO activity_logs (user_id, message, type, metadata) VALUES ($1, $2, $3, $4)`,
      [userId, message, type, metadata ? JSON.stringify(metadata) : null]
    );
  } catch (err) {
    logger.error(`Failed to log activity: ${err.message}`);
  }
}

export async function getOrCreateSemester(year, semesterNumber) {
  const label = `${year}-${semesterNumber}`;
  const existing = await query(`SELECT id FROM semesters WHERE label = $1`, [label]);
  if (existing.rows.length > 0) return existing.rows[0].id;

  const inserted = await query(
    `INSERT INTO semesters (label, year, semester_number) VALUES ($1, $2, $3) RETURNING id`,
    [label, year, semesterNumber]
  );
  return inserted.rows[0].id;
}

async function hasConflict(client, roomId, date, startTime, endTime) {
  const res = await client.query(
    `SELECT 1 FROM allocations
     WHERE room_id      = $1
       AND booking_date = $2
       AND NOT (end_time <= $3 OR $4 <= start_time)
     LIMIT 1`,
    [roomId, date, startTime, endTime]
  );
  return res.rows.length > 0;
}

async function checkWeeklyLimit(client, department, semesterId) {
  const res = await client.query(
    `SELECT allocated_count, max_limit
     FROM department_semester_usage
     WHERE department = $1 AND semester_id = $2`,
    [department, semesterId]
  );
  if (res.rows.length === 0) return { allowed: true, current: 0, max: 16 };
  const { allocated_count, max_limit } = res.rows[0];
  return {
    allowed:  allocated_count < max_limit,
    current:  allocated_count,
    max:      max_limit,
  };
}

async function incrementUsage(client, department, semesterId) {
  await client.query(
    `INSERT INTO department_semester_usage (department, semester_id, allocated_count)
     VALUES ($1, $2, 1)
     ON CONFLICT (department, semester_id)
     DO UPDATE SET allocated_count = department_semester_usage.allocated_count + 1`,
    [department, semesterId]
  );
}

// ── Core Allocator ────────────────────────────────────────────

/**
 * Allocate a single booking queue row inside a transaction.
 * Returns { success, allocation?, message }
 */
export async function allocateRequest(queueRow) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const {
      id: queueId,
      user_id:         userId,
      department,
      semester_id:     semesterId,
      lecture_name:    lectureName,
      booking_date:    date,
      start_time:      startTime,
      end_time:        endTime,
      specific_room_id: specificRoomId,
    } = queueRow;

    // ── 1. Weekly limit check ─────────────────────────────────
    const { allowed, current, max } = await checkWeeklyLimit(client, department, semesterId);
    if (!allowed) {
      const msg = `Weekly limit reached for ${department} (${current}/${max} bookings this semester)`;
      await client.query(`UPDATE booking_queue SET status='failed' WHERE id=$1`, [queueId]);
      await client.query('COMMIT');
      await logActivity(msg, 'error', userId, { queueId, department });
      return { success: false, message: msg };
    }

    let allocatedRoomId     = null;
    let allocatedRoomNumber = null;

    // ── 2a. Specific room requested ───────────────────────────
    if (specificRoomId) {
      const roomRes = await client.query(
        `SELECT id, room_number FROM rooms WHERE id = $1 AND is_active = true`,
        [specificRoomId]
      );
      if (roomRes.rows.length === 0) {
        const msg = `Room ID ${specificRoomId} does not exist or is inactive`;
        await client.query(`UPDATE booking_queue SET status='failed' WHERE id=$1`, [queueId]);
        await client.query('COMMIT');
        await logActivity(msg, 'error', userId);
        return { success: false, message: msg };
      }
      const room     = roomRes.rows[0];
      const conflict = await hasConflict(client, room.id, date, startTime, endTime);
      if (conflict) {
        const msg = `${room.room_number} is not available on ${date} at ${startTime}–${endTime}`;
        await client.query(`UPDATE booking_queue SET status='failed' WHERE id=$1`, [queueId]);
        await client.query('COMMIT');
        await logActivity(msg, 'error', userId);
        return { success: false, message: msg };
      }
      allocatedRoomId     = room.id;
      allocatedRoomNumber = room.room_number;

    // ── 2b. First-fit sequential ──────────────────────────────
    } else {
      const allRooms = await client.query(
        `SELECT id, room_number FROM rooms WHERE is_active = true ORDER BY id ASC`
      );
      for (const room of allRooms.rows) {
        const conflict = await hasConflict(client, room.id, date, startTime, endTime);
        if (!conflict) {
          allocatedRoomId     = room.id;
          allocatedRoomNumber = room.room_number;
          break;
        }
      }
      if (!allocatedRoomId) {
        const msg = `No available room for "${lectureName}" on ${date} ${startTime}–${endTime}`;
        await client.query(`UPDATE booking_queue SET status='failed' WHERE id=$1`, [queueId]);
        await client.query('COMMIT');
        await logActivity(msg, 'error', userId);
        return { success: false, message: msg };
      }
    }

    // ── 3. Insert allocation ──────────────────────────────────
    const inserted = await client.query(
      `INSERT INTO allocations
         (room_id, queue_id, user_id, department, semester_id, lecture_name, booking_date, start_time, end_time)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [allocatedRoomId, queueId, userId, department, semesterId, lectureName, date, startTime, endTime]
    );
    const allocation = inserted.rows[0];

    // ── 4. Increment usage counter ────────────────────────────
    await incrementUsage(client, department, semesterId);

    // ── 5. Mark queue row as allocated ────────────────────────
    await client.query(`UPDATE booking_queue SET status='allocated' WHERE id=$1`, [queueId]);

    await client.query('COMMIT');

    const msg = `${allocatedRoomNumber} allocated to ${department} for "${lectureName}" on ${date}`;
    await logActivity(msg, 'success', userId, { allocationId: allocation.id });

    return {
      success: true,
      allocation: { ...allocation, room_number: allocatedRoomNumber },
      message: msg,
    };

  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(`Allocation error: ${err.message}`);
    await logActivity(`Unexpected error processing request: ${err.message}`, 'error');
    return { success: false, message: `Unexpected error: ${err.message}` };
  } finally {
    client.release();
  }
}
