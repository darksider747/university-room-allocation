import { Router } from 'express';
import { getRooms, getRoomById, createRoom, updateRoom } from '../controllers/roomController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { roomSchema } from '../validations/schemas.js';

const router = Router();

router.use(protect);

router.get('/',       getRooms);
router.get('/:id',    getRoomById);
router.post('/',      restrictTo('admin', 'super_admin'), validate(roomSchema), createRoom);
router.patch('/:id',  restrictTo('admin', 'super_admin'), updateRoom);

export default router;
