import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { getMySchedule, getPreferences, setPreference, deletePreference } from '../controllers/facultyController.js';

const router = Router();
router.use(protect, restrictTo('faculty', 'hod', 'super_admin'));

router.get('/schedule',         getMySchedule);
router.get('/preferences',      getPreferences);
router.post('/preferences',     setPreference);
router.delete('/preferences/:id', deletePreference);

export default router;
