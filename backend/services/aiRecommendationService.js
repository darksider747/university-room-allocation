/**
 * services/aiRecommendationService.js
 *
 * Rule-based AI recommendation engine for room allocation.
 * Scores rooms based on: capacity fit, type match, conflicts,
 * utilization, faculty preferences, and proximity.
 *
 * Returns ranked list with scores and explanations.
 */

import { query } from '../db/pool.js';
import logger from '../utils/logger.js';

// ── Weight constants ──────────────────────────────────────────
const W = {
  CAPACITY_FIT:      30,  // Penalize over/under capacity
  ROOM_TYPE:         25,  // Matches required type (lab/smart/etc)
  NO_CONFLICT:       20,  // Conflict-free slot
  LOW_UTILIZATION:   15,  // Less busy = better
  FACULTY_PREF:       5,  // Faculty available at this time
  FEATURES:           5,  // Projector / AC bonus
};

/**
 * Get ranked room recommendations for a timetable slot.
 *
 * @param {object} params
 * @param {number} params.studentStrength   Expected students
 * @param {string} params.requiredType      'classroom'|'lab'|'smart'|'seminar'
 * @param {string} params.labType           Required lab type (optional)
 * @param {number} params.dayOfWeek         0-6
 * @param {string} params.startTime         'HH:MM'
 * @param {string} params.endTime           'HH:MM'
 * @param {number} params.facultyId         (optional) for preference check
 * @param {number} params.excludeEntryId    Skip this entry when checking conflicts
 * @returns {Array} Ranked recommendations with scores
 */
export async function getRecommendations(params) {
  const {
    studentStrength = 40,
    requiredType    = 'classroom',
    labType         = null,
    dayOfWeek,
    startTime,
    endTime,
    facultyId       = null,
    excludeEntryId  = null,
  } = params;

  try {
    // Fetch all active rooms
    const roomsRes = await query(
      `SELECT r.*,
              COUNT(te.id) AS weekly_usage
       FROM rooms r
       LEFT JOIN timetable_entries te ON te.room_id = r.id
         AND te.status IN ('approved','published')
       WHERE r.is_active = true
       GROUP BY r.id
       ORDER BY r.id`
    );

    // Fetch conflicting room IDs for this time slot
    const conflictRes = await query(
      `SELECT DISTINCT room_id FROM timetable_entries
       WHERE day_of_week = $1
         AND status IN ('approved','published')
         AND NOT (end_time <= $2 OR $3 <= start_time)
         ${excludeEntryId ? 'AND id != ' + excludeEntryId : ''}`,
      [dayOfWeek, startTime, endTime]
    );
    const conflictRoomIds = new Set(conflictRes.rows.map((r) => r.room_id));

    // Faculty preference check
    let facultyUnavailable = new Set();
    if (facultyId) {
      const prefRes = await query(
        `SELECT * FROM faculty_preferences
         WHERE faculty_id = $1 AND day_of_week = $2 AND preference = 'unavailable'
           AND start_time <= $3 AND end_time >= $4`,
        [facultyId, dayOfWeek, startTime, endTime]
      );
      if (prefRes.rows.length > 0) facultyUnavailable = true;
    }

    const maxUsage = Math.max(...roomsRes.rows.map((r) => parseInt(r.weekly_usage) || 0), 1);

    const scored = roomsRes.rows.map((room) => {
      let score    = 0;
      const reasons = [];
      const warnings = [];

      // ── 1. Capacity fit ──────────────────────────────────────
      const cap  = room.capacity;
      const diff = cap - studentStrength;
      if (diff >= 0 && diff <= 10) {
        score += W.CAPACITY_FIT;           // Perfect fit
        reasons.push(`Capacity ${cap} — ideal for ${studentStrength} students`);
      } else if (diff > 10 && diff <= 30) {
        score += W.CAPACITY_FIT * 0.7;
        reasons.push(`Capacity ${cap} — slight oversize`);
      } else if (diff > 30) {
        score += W.CAPACITY_FIT * 0.3;
        warnings.push(`Room is much larger than needed (${cap} seats)`);
      } else {
        // Under capacity
        score += 0;
        warnings.push(`⚠ Under capacity: ${cap} seats for ${studentStrength} students`);
      }

      // ── 2. Room type match ───────────────────────────────────
      if (room.room_type === requiredType) {
        score += W.ROOM_TYPE;
        reasons.push(`Matches required type: ${requiredType}`);
      } else if (requiredType === 'classroom' && room.room_type === 'smart') {
        score += W.ROOM_TYPE * 0.8;       // Smart rooms work for regular classes
        reasons.push('Smart classroom — bonus features available');
      }

      // Lab type match
      if (labType && room.lab_type === labType) {
        score += 10;
        reasons.push(`Exact lab match: ${labType}`);
      } else if (labType && room.room_type === 'lab') {
        score += 5;
        warnings.push(`Different lab type (${room.lab_type})`);
      }

      // ── 3. Conflict check ────────────────────────────────────
      const hasConflict = conflictRoomIds.has(room.id);
      if (!hasConflict) {
        score += W.NO_CONFLICT;
        reasons.push('Free slot — no scheduling conflicts');
      } else {
        score  = 0;                        // Hard block — conflicted rooms score 0
        warnings.push('⛔ Conflict: already booked at this time');
      }

      // ── 4. Utilization (prefer less busy) ────────────────────
      const usage = parseInt(room.weekly_usage) || 0;
      const utilizationScore = W.LOW_UTILIZATION * (1 - usage / maxUsage);
      score += utilizationScore;
      if (usage < 5) reasons.push(`Low utilization (${usage} classes/week)`);

      // ── 5. Faculty preference ────────────────────────────────
      if (facultyId && !facultyUnavailable) {
        score += W.FACULTY_PREF;
        reasons.push('Faculty available at this time');
      } else if (facultyUnavailable) {
        warnings.push('Faculty marked unavailable for this slot');
      }

      // ── 6. Features bonus ────────────────────────────────────
      if (room.has_projector) {
        score += W.FEATURES * 0.6;
        reasons.push('Projector available');
      }
      if (room.has_ac) {
        score += W.FEATURES * 0.4;
        reasons.push('Air-conditioned');
      }

      // ── Derived metrics ───────────────────────────────────────
      const maxPossible = Object.values(W).reduce((a, b) => a + b, 0) + 10;
      const normalizedScore = Math.round((score / maxPossible) * 100);
      const conflictProbability = hasConflict ? 100 : Math.round((usage / 20) * 40);
      const optimizationScore   = normalizedScore;

      return {
        room: {
          id:          room.id,
          room_number: room.room_number,
          capacity:    room.capacity,
          room_type:   room.room_type,
          building:    room.building,
          floor:       room.floor,
          has_projector: room.has_projector,
          has_ac:        room.has_ac,
          lab_type:      room.lab_type,
          weekly_usage:  usage,
        },
        score:              normalizedScore,
        conflict_probability: conflictProbability,
        optimization_score:   optimizationScore,
        is_available:       !hasConflict,
        reasons,
        warnings,
        badge: normalizedScore >= 80 ? 'Best Match'
             : normalizedScore >= 60 ? 'Good Fit'
             : normalizedScore >= 40 ? 'Acceptable'
             : 'Not Recommended',
      };
    });

    // Sort: available rooms by score DESC, unavailable last
    scored.sort((a, b) => {
      if (a.is_available !== b.is_available) return a.is_available ? -1 : 1;
      return b.score - a.score;
    });

    return scored.slice(0, 8); // Return top 8 recommendations
  } catch (err) {
    logger.error(`AI recommendation error: ${err.message}`);
    return [];
  }
}
