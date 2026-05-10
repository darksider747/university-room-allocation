/**
 * middleware/auth.js — JWT authentication & role-based authorization
 */

import jwt from 'jsonwebtoken';
import { query } from '../db/pool.js';
import { AppError } from '../utils/AppError.js';
import { sendError } from '../utils/apiResponse.js';

/**
 * Verifies JWT token and attaches user to req.user
 */
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return sendError(res, 'Access denied. No token provided.', 401);
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return sendError(res, 'Token expired. Please log in again.', 401);
      }
      return sendError(res, 'Invalid token.', 401);
    }

    // Fetch fresh user from DB (include department_id for HOD checks)
    const result = await query(
      `SELECT u.id, u.name, u.email, u.role, u.department, u.is_active,
              d.id AS department_id
       FROM users u
       LEFT JOIN departments d ON d.name = u.department
       WHERE u.id = $1`,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return sendError(res, 'User no longer exists.', 401);
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return sendError(res, 'Your account has been deactivated.', 401);
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Restrict access to specific roles
 * Usage: restrictTo('admin') or restrictTo('admin', 'student')
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return sendError(res, 'You do not have permission to perform this action.', 403);
    }
    next();
  };
};
