import { Router } from 'express';
import { query } from '../db/pool.js';
import { protect } from '../middleware/auth.js';
import { catchAsync } from '../utils/AppError.js';
import { sendSuccess } from '../utils/apiResponse.js';

const router = Router();

router.use(protect);

router.get('/', catchAsync(async (req, res) => {
  const result = await query(
    `SELECT * FROM semesters ORDER BY year ASC, semester_number ASC`
  );
  return sendSuccess(res, { semesters: result.rows });
}));

export default router;
