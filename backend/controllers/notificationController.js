/**
 * controllers/notificationController.js
 */

import { query } from '../db/pool.js';
import { catchAsync } from '../utils/AppError.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

// GET /notifications — paginated list for current user
export const getNotifications = catchAsync(async (req, res) => {
  const limit  = Math.min(100, parseInt(req.query.limit || '20'));
  const unreadOnly = req.query.unread === 'true';

  const where = unreadOnly
    ? 'WHERE user_id = $1 AND is_read = false'
    : 'WHERE user_id = $1';

  const [dataRes, countRes] = await Promise.all([
    query(
      `SELECT * FROM notifications ${where}
       ORDER BY created_at DESC LIMIT $2`,
      [req.user.id, limit]
    ),
    query(
      `SELECT COUNT(*) AS total, SUM(CASE WHEN is_read = false THEN 1 ELSE 0 END) AS unread
       FROM notifications WHERE user_id = $1`,
      [req.user.id]
    ),
  ]);

  return sendSuccess(res, {
    notifications: dataRes.rows,
    total:  parseInt(countRes.rows[0].total),
    unread: parseInt(countRes.rows[0].unread || 0),
  });
});

// PATCH /notifications/:id/read
export const markRead = catchAsync(async (req, res) => {
  await query(
    `UPDATE notifications SET is_read = true
     WHERE id = $1 AND user_id = $2`,
    [req.params.id, req.user.id]
  );
  return sendSuccess(res, { message: 'Marked as read.' });
});

// PATCH /notifications/read-all
export const markAllRead = catchAsync(async (req, res) => {
  const result = await query(
    `UPDATE notifications SET is_read = true
     WHERE user_id = $1 AND is_read = false`,
    [req.user.id]
  );
  return sendSuccess(res, { message: 'All notifications marked as read.', count: result.rowCount });
});

// DELETE /notifications/:id
export const deleteNotification = catchAsync(async (req, res) => {
  await query(
    `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
    [req.params.id, req.user.id]
  );
  return sendSuccess(res, { message: 'Notification deleted.' });
});

// GET /notifications/unread-count — lightweight poll endpoint
export const getUnreadCount = catchAsync(async (req, res) => {
  const result = await query(
    `SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND is_read = false`,
    [req.user.id]
  );
  return sendSuccess(res, { count: parseInt(result.rows[0].count) });
});
