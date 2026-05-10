import { Router } from 'express';
import {
  getAllocations, getRoomSchedule, getDashboardStats,
  getLogs, getUsage,
} from '../controllers/allocationController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/dashboard', getDashboardStats);
router.get('/',          getAllocations);
router.get('/schedule',  getRoomSchedule);
router.get('/logs',      restrictTo('admin'), getLogs);
router.get('/usage',     getUsage);

export default router;
