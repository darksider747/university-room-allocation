/**
 * services/notificationService.js
 * Central hub for all in-app + Socket.io notifications.
 * Email is optional (only fires when SMTP env vars are set).
 */

import { query } from '../db/pool.js';
import logger from '../utils/logger.js';

// Socket.io instance — set by server.js after init
let _io = null;
export function setSocketIO(io) { _io = io; }

// ── Core: persist notification and emit via socket ────────────

export async function createNotification({
  userId,
  type,
  title,
  message,
  metadata = null,
}) {
  try {
    const result = await query(
      `INSERT INTO notifications (user_id, type, title, message, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, type, title, message, metadata ? JSON.stringify(metadata) : null]
    );
    const notif = result.rows[0];

    // Emit in real-time if socket server is running
    if (_io) {
      _io.to(`user:${userId}`).emit('notification', notif);
    }

    return notif;
  } catch (err) {
    logger.error(`Failed to create notification: ${err.message}`);
    return null;
  }
}

// ── Bulk: notify all students in a section ────────────────────

export async function notifySection({
  departmentId,
  semesterId,
  section,
  type,
  title,
  message,
  metadata = null,
}) {
  try {
    // Get all students enrolled in this dept+semester+section
    const res = await query(
      `SELECT student_id FROM student_sections
       WHERE department_id = $1 AND semester_id = $2 AND section = $3`,
      [departmentId, semesterId, section]
    );

    const promises = res.rows.map((r) =>
      createNotification({ userId: r.student_id, type, title, message, metadata })
    );
    await Promise.all(promises);

    logger.info(`Notified ${res.rows.length} students in section ${section}`);
  } catch (err) {
    logger.error(`notifySection error: ${err.message}`);
  }
}

// ── Bulk: notify all students in a department ─────────────────

export async function notifyDepartment({
  departmentId,
  semesterId,
  type,
  title,
  message,
  metadata = null,
}) {
  try {
    const res = await query(
      `SELECT DISTINCT student_id FROM student_sections
       WHERE department_id = $1 AND semester_id = $2`,
      [departmentId, semesterId]
    );

    const promises = res.rows.map((r) =>
      createNotification({ userId: r.student_id, type, title, message, metadata })
    );
    await Promise.all(promises);
  } catch (err) {
    logger.error(`notifyDepartment error: ${err.message}`);
  }
}

// ── Convenience wrappers for each notification type ───────────

export async function notifyRoomAssigned({ entry, departmentId, semesterId }) {
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  return notifySection({
    departmentId,
    semesterId,
    section: entry.section,
    type: 'room_assigned',
    title: '📍 Room Assigned',
    message: `${entry.subject_name} has been assigned to ${entry.room_number} on ${days[entry.day_of_week]}s ${entry.start_time}–${entry.end_time}.`,
    metadata: { entryId: entry.id, roomId: entry.room_id },
  });
}

export async function notifyRoomChanged({ entry, oldRoom, newRoom, departmentId, semesterId }) {
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  return notifySection({
    departmentId,
    semesterId,
    section: entry.section,
    type: 'room_changed',
    title: '🔄 Room Changed',
    message: `${entry.subject_name} venue changed from ${oldRoom} to ${newRoom} on ${days[entry.day_of_week]}s.`,
    metadata: { entryId: entry.id, oldRoom, newRoom },
  });
}

export async function notifyTimetablePublished({ departmentId, semesterId, publishedBy }) {
  return notifyDepartment({
    departmentId,
    semesterId,
    type: 'timetable_published',
    title: '📅 Timetable Published',
    message: 'Your department timetable has been published. Check your schedule now.',
    metadata: { publishedBy, departmentId, semesterId },
  });
}

export async function notifyClassCancelled({ entry, departmentId, semesterId, reason }) {
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  return notifySection({
    departmentId,
    semesterId,
    section: entry.section,
    type: 'class_cancelled',
    title: '❌ Class Cancelled',
    message: `${entry.subject_name} on ${days[entry.day_of_week]} ${entry.start_time}–${entry.end_time} has been cancelled.${reason ? ' Reason: ' + reason : ''}`,
    metadata: { entryId: entry.id, reason },
  });
}

export async function notifyClassRescheduled({ entry, oldDay, oldTime, departmentId, semesterId }) {
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  return notifySection({
    departmentId,
    semesterId,
    section: entry.section,
    type: 'class_rescheduled',
    title: '🔁 Class Rescheduled',
    message: `${entry.subject_name} moved from ${days[oldDay]} ${oldTime} to ${days[entry.day_of_week]} ${entry.start_time}–${entry.end_time}.`,
    metadata: { entryId: entry.id },
  });
}
