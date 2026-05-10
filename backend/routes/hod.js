import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import {
  getMyDepartment, getTimetable, createTimetableEntry,
  assignRoom, approveEntry, publishTimetable, cancelEntry,
  deleteEntry, getAiRecommendations, getAnalytics, getEntryChanges,
} from '../controllers/hodController.js';

const router = Router();
router.use(protect, restrictTo('hod', 'super_admin'));

router.get('/department',              getMyDepartment);
router.get('/timetable',               getTimetable);
router.post('/timetable',              createTimetableEntry);
router.patch('/timetable/:id/room',    assignRoom);
router.patch('/timetable/:id/approve', approveEntry);
router.patch('/timetable/:id/cancel',  cancelEntry);
router.post('/timetable/publish',      publishTimetable);
router.delete('/timetable/:id',        deleteEntry);
router.get('/timetable/:id/changes',   getEntryChanges);
router.get('/ai-recommend',            getAiRecommendations);
router.get('/analytics',               getAnalytics);

export default router;
