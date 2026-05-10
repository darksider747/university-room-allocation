import { Router } from 'express';
import { register, login, getMe, updateMe, changePassword } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema, updateUserSchema, changePasswordSchema } from '../validations/schemas.js';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login',    validate(loginSchema),    login);
router.get('/me',        protect,                  getMe);
router.patch('/me',      protect, validate(updateUserSchema), updateMe);
router.patch('/me/password', protect, validate(changePasswordSchema), changePassword);

export default router;
