/**
 * utils/apiResponse.js — Standardized API response helpers
 */

export const sendSuccess = (res, data, statusCode = 200, meta = {}) => {
  const response = { success: true, ...data };
  if (Object.keys(meta).length) response.meta = meta;
  return res.status(statusCode).json(response);
};

export const sendError = (res, message, statusCode = 400, errors = null) => {
  const response = { success: false, error: message };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

export const sendPaginated = (res, data, total, page, limit) => {
  return res.json({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  });
};
