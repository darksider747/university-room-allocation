import { Router } from 'express';
import { processNext, processAll } from '../controllers/processController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();

router.use(protect, restrictTo('admin', 'super_admin'));

router.post('/next', processNext);
router.post('/all',  processAll);

export default router;
