import { Router } from 'express';
import { addToQueue, getQueue, deleteQueueItem } from '../controllers/queueController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { bookingSchema } from '../validations/schemas.js';

const router = Router();

router.use(protect);

router.post('/',         validate(bookingSchema), addToQueue);
router.get('/',          getQueue);
router.delete('/:id',    deleteQueueItem);

export default router;
