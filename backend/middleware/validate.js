/**
 * middleware/validate.js — Joi schema validation middleware
 */

import { sendError } from '../utils/apiResponse.js';

/**
 * Creates a middleware that validates req.body against a Joi schema
 * Returns 400 with field-level error details on failure
 */
export const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map((d) => ({
      field:   d.path.join('.'),
      message: d.message.replace(/['"]/g, ''),
    }));
    return sendError(res, 'Validation failed', 400, errors);
  }

  req.body = value; // Replace body with sanitized/defaulted values
  next();
};

/**
 * Validates req.query against a Joi schema
 */
export const validateQuery = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.query, {
    abortEarly: false,
    convert: true,
  });

  if (error) {
    const errors = error.details.map((d) => ({
      field:   d.path.join('.'),
      message: d.message.replace(/['"]/g, ''),
    }));
    return sendError(res, 'Invalid query parameters', 400, errors);
  }

  req.query = value;
  next();
};
