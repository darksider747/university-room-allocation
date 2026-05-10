import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { getMyTimetable, getEnrollments, enroll } from '../controllers/studentController.js';

const router = Router();
router.use(protect, restrictTo('student', 'super_admin'));

router.get('/timetable',    getMyTimetable);
router.get('/enrollments',  getEnrollments);
router.post('/enroll',      enroll);

export default router;
