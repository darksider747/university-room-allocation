import { Router } from 'express';
import {
  getAllUsers, updateUserRole, toggleUserStatus,
  createAdminUser, deleteAllocation,
} from '../controllers/adminController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();

router.use(protect, restrictTo('admin', 'super_admin'));

router.get('/users',               getAllUsers);
router.patch('/users/:id/role',    updateUserRole);
router.patch('/users/:id/status',  toggleUserStatus);
router.post('/users',              createAdminUser);
router.delete('/allocations/:id',  deleteAllocation);

export default router;
