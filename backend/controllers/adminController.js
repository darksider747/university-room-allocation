/**
 * controllers/adminController.js
 */

import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import { catchAsync } from '../utils/AppError.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { logActivity } from '../services/allocationService.js';

export const getAllUsers = catchAsync(async (req, res) => {
  const result = await query(
    `SELECT id, name, email, role, department, is_active, created_at FROM users ORDER BY created_at DESC`
  );
  return sendSuccess(res, { users: result.rows, count: result.rows.length });
});

export const updateUserRole = catchAsync(async (req, res) => {
  const { role } = req.body;
  if (!['super_admin','admin','hod','faculty','student'].includes(role)) {
    return sendError(res, 'Role must be one of: super_admin, admin, hod, faculty, student.', 400);
  }
  const result = await query(
    `UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role`,
    [role, req.params.id]
  );
  if (result.rows.length === 0) return sendError(res, 'User not found.', 404);

  await logActivity(`User role updated: ${result.rows[0].email} → ${role}`, 'info', req.user.id);
  return sendSuccess(res, { user: result.rows[0] });
});

export const toggleUserStatus = catchAsync(async (req, res) => {
  const result = await query(
    `UPDATE users SET is_active = NOT is_active WHERE id = $1
     RETURNING id, name, email, is_active`,
    [req.params.id]
  );
  if (result.rows.length === 0) return sendError(res, 'User not found.', 404);

  const action = result.rows[0].is_active ? 'activated' : 'deactivated';
  await logActivity(`User ${action}: ${result.rows[0].email}`, 'info', req.user.id);
  return sendSuccess(res, { user: result.rows[0], action });
});

export const createAdminUser = catchAsync(async (req, res) => {
  const { name, email, password, department } = req.body;

  const exists = await query(`SELECT id FROM users WHERE email = $1`, [email]);
  if (exists.rows.length > 0) {
    return sendError(res, 'Email already in use.', 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await query(
    `INSERT INTO users (name, email, password_hash, role, department)
     VALUES ($1, $2, $3, 'admin', $4)
     RETURNING id, name, email, role, department`,
    [name, email, passwordHash, department]
  );

  await logActivity(`Admin user created: ${email}`, 'info', req.user.id);
  return sendSuccess(res, { user: result.rows[0] }, 201);
});

export const deleteAllocation = catchAsync(async (req, res) => {
  const result = await query(
    `DELETE FROM allocations WHERE id = $1 RETURNING *`, [req.params.id]
  );
  if (result.rows.length === 0) return sendError(res, 'Allocation not found.', 404);

  await logActivity(`Allocation #${req.params.id} deleted by admin`, 'warning', req.user.id);
  return sendSuccess(res, { message: 'Allocation deleted.', deleted: result.rows[0] });
});
