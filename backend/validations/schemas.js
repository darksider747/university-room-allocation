/**
 * validations/schemas.js — Joi validation schemas
 */

import Joi from 'joi';

// ── Auth ──────────────────────────────────────────────────────
export const registerSchema = Joi.object({
  name:       Joi.string().min(2).max(100).trim().required(),
  email:      Joi.string().email().lowercase().trim().required(),
  password:   Joi.string().min(8).max(64)
                .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
                .required()
                .messages({
                  'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
                }),
  department: Joi.string().max(100).trim().optional(),
  role:       Joi.string().valid('student').default('student'), // Only admins can create admins
});

export const loginSchema = Joi.object({
  email:    Joi.string().email().lowercase().trim().required(),
  password: Joi.string().required(),
});

// ── Queue / Booking ───────────────────────────────────────────
export const bookingSchema = Joi.object({
  department:     Joi.string().min(2).max(100).trim().required(),
  semesterYear:   Joi.number().integer().min(2020).max(2035).required(),
  semesterNumber: Joi.number().integer().min(1).max(8).required(),
  lectureName:    Joi.string().min(2).max(200).trim().required(),
  date:           Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required()
                    .messages({ 'string.pattern.base': 'Date must be in YYYY-MM-DD format' }),
  startTime:      Joi.string().pattern(/^\d{2}:\d{2}$/).required()
                    .messages({ 'string.pattern.base': 'Start time must be in HH:MM format' }),
  endTime:        Joi.string().pattern(/^\d{2}:\d{2}$/).required()
                    .messages({ 'string.pattern.base': 'End time must be in HH:MM format' }),
  specificRoomId: Joi.number().integer().positive().allow(null, '').optional(),
  notes:          Joi.string().max(500).trim().allow('', null).optional(),
});

// ── Room ──────────────────────────────────────────────────────
export const roomSchema = Joi.object({
  roomNumber: Joi.string().min(1).max(50).trim().required(),
  capacity:   Joi.number().integer().min(1).max(500).required(),
  building:   Joi.string().max(100).trim().default('Main Block'),
  floor:      Joi.number().integer().min(0).max(20).default(0),
});

// ── Pagination ────────────────────────────────────────────────
export const paginationSchema = Joi.object({
  page:  Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

// ── Room Schedule Query ───────────────────────────────────────
export const roomScheduleSchema = Joi.object({
  roomId:    Joi.number().integer().positive().required(),
  startDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  endDate:   Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
});

// ── Update User ───────────────────────────────────────────────
export const updateUserSchema = Joi.object({
  name:       Joi.string().min(2).max(100).trim(),
  department: Joi.string().max(100).trim().allow('', null),
}).min(1);

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword:     Joi.string().min(8).max(64)
                     .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
                     .required(),
});
