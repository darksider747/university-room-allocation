/**
 * controllers/processController.js
 */

import { query } from '../db/pool.js';
import { catchAsync } from '../utils/AppError.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { allocateRequest } from '../services/allocationService.js';

export const processNext = catchAsync(async (req, res) => {
  const pending = await query(
    `SELECT * FROM booking_queue WHERE status = 'pending' ORDER BY id ASC LIMIT 1`
  );

  if (pending.rows.length === 0) {
    return sendSuccess(res, { message: 'Queue is empty.', processed: null });
  }

  const queueRow = pending.rows[0];
  const result   = await allocateRequest(queueRow);

  return sendSuccess(res, { processed: queueRow.id, ...result });
});

export const processAll = catchAsync(async (req, res) => {
  const pending = await query(
    `SELECT * FROM booking_queue WHERE status = 'pending' ORDER BY id ASC`
  );

  if (pending.rows.length === 0) {
    return sendSuccess(res, { message: 'Queue is empty.', results: [] });
  }

  const results = [];
  for (const queueRow of pending.rows) {
    const result = await allocateRequest(queueRow);
    results.push({ queueId: queueRow.id, ...result });
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed    = results.filter((r) => !r.success).length;

  return sendSuccess(res, {
    message: `Processed ${results.length} requests: ${succeeded} allocated, ${failed} failed.`,
    results,
    summary: { total: results.length, succeeded, failed },
  });
});
