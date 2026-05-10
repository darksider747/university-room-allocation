/**
 * controllers/authController.js
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/pool.js';
import { catchAsync, AppError } from '../utils/AppError.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { logActivity } from '../services/allocationService.js';

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

export const register = catchAsync(async (req, res) => {
  const { name, email, password, department } = req.body;

  // Check existing user
  const exists = await query(`SELECT id FROM users WHERE email = $1`, [email]);
  if (exists.rows.length > 0) {
    return sendError(res, 'An account with this email already exists.', 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await query(
    `INSERT INTO users (name, email, password_hash, role, department)
     VALUES ($1, $2, $3, 'student', $4)
     RETURNING id, name, email, role, department, created_at`,
    [name, email, passwordHash, department || null]
  );  const user  = result.rows[0];
  const token = signToken(user.id);

  await logActivity(`New user registered: ${name} (${email})`, 'info', user.id);

  return sendSuccess(res, { token, user }, 201);
});

export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const result = await query(
    `SELECT id, name, email, password_hash, role, department, is_active FROM users WHERE email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    return sendError(res, 'Invalid email or password.', 401);
  }

  const user = result.rows[0];

  if (!user.is_active) {
    return sendError(res, 'Your account has been deactivated. Contact admin.', 401);
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    return sendError(res, 'Invalid email or password.', 401);
  }

  const token = signToken(user.id);
  const { password_hash, ...safeUser } = user;

  await logActivity(`User logged in: ${user.email}`, 'info', user.id);

  return sendSuccess(res, { token, user: safeUser });
});

export const getMe = catchAsync(async (req, res) => {
  const result = await query(
    `SELECT id, name, email, role, department, is_active, created_at FROM users WHERE id = $1`,
    [req.user.id]
  );
  return sendSuccess(res, { user: result.rows[0] });
});

export const updateMe = catchAsync(async (req, res) => {
  const { name, department } = req.body;
  const result = await query(
    `UPDATE users SET name = COALESCE($1, name), department = COALESCE($2, department)
     WHERE id = $3
     RETURNING id, name, email, role, department, created_at`,
    [name, department, req.user.id]
  );
  return sendSuccess(res, { user: result.rows[0] });
});

export const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const result = await query(`SELECT password_hash FROM users WHERE id = $1`, [req.user.id]);
  const isMatch = await bcrypt.compare(currentPassword, result.rows[0].password_hash);

  if (!isMatch) {
    return sendError(res, 'Current password is incorrect.', 400);
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [newHash, req.user.id]);

  return sendSuccess(res, { message: 'Password updated successfully.' });
});
