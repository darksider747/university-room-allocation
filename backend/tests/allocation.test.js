/**
 * tests/allocation.test.js — Allocation service unit tests
 */

// Mock the DB pool so tests run without a real database
jest.mock('../db/pool.js', () => ({
  query:     jest.fn(),
  getClient: jest.fn(),
}));

jest.mock('../utils/logger.js', () => ({
  default: { info: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn() },
}));

import { query, getClient } from '../db/pool.js';
import { getOrCreateSemester } from '../services/allocationService.js';

describe('allocationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrCreateSemester', () => {
    it('should return existing semester id', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 5 }] });
      const id = await getOrCreateSemester(2026, 1);
      expect(id).toBe(5);
      expect(query).toHaveBeenCalledTimes(1);
    });

    it('should insert and return new semester id', async () => {
      query.mockResolvedValueOnce({ rows: [] }); // not found
      query.mockResolvedValueOnce({ rows: [{ id: 10 }] }); // inserted
      const id = await getOrCreateSemester(2027, 3);
      expect(id).toBe(10);
      expect(query).toHaveBeenCalledTimes(2);
    });
  });
});

describe('Validation Schemas', () => {
  let bookingSchema;

  beforeAll(async () => {
    const mod = await import('../validations/schemas.js');
    bookingSchema = mod.bookingSchema;
  });

  it('should pass valid booking data', () => {
    const { error } = bookingSchema.validate({
      department:     'Computer Science',
      semesterYear:   2026,
      semesterNumber: 1,
      lectureName:    'Data Structures',
      date:           '2026-06-15',
      startTime:      '09:00',
      endTime:        '11:00',
    });
    expect(error).toBeUndefined();
  });

  it('should reject missing department', () => {
    const { error } = bookingSchema.validate({
      semesterYear: 2026,
      semesterNumber: 1,
      lectureName: 'Test',
      date: '2026-06-15',
      startTime: '09:00',
      endTime: '11:00',
    });
    expect(error).toBeDefined();
    expect(error.details[0].path[0]).toBe('department');
  });

  it('should reject invalid date format', () => {
    const { error } = bookingSchema.validate({
      department: 'CS',
      semesterYear: 2026,
      semesterNumber: 1,
      lectureName: 'Test',
      date: '15-06-2026', // wrong format
      startTime: '09:00',
      endTime: '11:00',
    });
    expect(error).toBeDefined();
  });

  it('should reject semester number out of range', () => {
    const { error } = bookingSchema.validate({
      department: 'CS',
      semesterYear: 2026,
      semesterNumber: 9, // max is 8
      lectureName: 'Test',
      date: '2026-06-15',
      startTime: '09:00',
      endTime: '11:00',
    });
    expect(error).toBeDefined();
  });
});
