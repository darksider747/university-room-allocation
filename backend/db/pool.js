/**
 * db/pool.js — PostgreSQL Connection Pool
 */

import pg from 'pg';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  max: 10,
  idleTimeoutMillis:   30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL pool error:', err);
});

pool.on('connect', () => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug('New PostgreSQL client connected');
  }
});

/** Execute a single parameterized query */
export async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`[DB] ${duration}ms — ${text.slice(0, 80)}`);
    }
    return result;
  } catch (err) {
    logger.error(`[DB ERROR] ${err.message} — Query: ${text.slice(0, 100)}`);
    throw err;
  }
}

/** Acquire a client for transactions */
export async function getClient() {
  return pool.connect();
}

/** Test the database connection */
export async function testConnection() {
  try {
    const res = await pool.query('SELECT NOW()');
    logger.info(`✅  Database connected at ${res.rows[0].now}`);
    return true;
  } catch (err) {
    logger.error(`❌  Database connection failed: ${err.message}`);
    return false;
  }
}

export default pool;
