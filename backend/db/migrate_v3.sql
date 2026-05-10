-- ============================================================
-- UOM Room Allocation System v3.0 — Incremental Migration
-- Run AFTER existing schema is in place.
-- Safe to re-run (all statements use IF NOT EXISTS / DO NOTHING)
-- ============================================================

BEGIN;

-- ── 1. Extend users.role to include new roles ─────────────────
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('super_admin','admin','hod','faculty','student'));

-- Back-fill: old 'admin' becomes 'super_admin'
UPDATE users SET role = 'super_admin' WHERE role = 'admin';

-- ── 2. Extend rooms with extra attributes ─────────────────────
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_type     TEXT    NOT NULL DEFAULT 'classroom'
  CHECK (room_type IN ('classroom','lab','smart','seminar','auditorium'));
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS has_projector BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS has_ac        BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS lab_type      TEXT;          -- e.g. 'CS Lab','Physics Lab'

-- ── 3. Extend departments ─────────────────────────────────────
ALTER TABLE departments ADD COLUMN IF NOT EXISTS code        TEXT UNIQUE;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS hod_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS is_active   BOOLEAN NOT NULL DEFAULT TRUE;

-- ── 4. Timetable entries (HOD-managed recurring schedule) ─────
CREATE TABLE IF NOT EXISTS timetable_entries (
    id            SERIAL      PRIMARY KEY,
    department_id INTEGER     NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    semester_id   INTEGER     NOT NULL REFERENCES semesters(id),
    room_id       INTEGER     REFERENCES rooms(id) ON DELETE SET NULL,
    faculty_id    INTEGER     REFERENCES users(id) ON DELETE SET NULL,
    subject_name  TEXT        NOT NULL,
    section       TEXT        NOT NULL DEFAULT 'A',   -- e.g. 'CS-5A'
    day_of_week   INTEGER     NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Mon
    start_time    TIME        NOT NULL,
    end_time      TIME        NOT NULL,
    status        TEXT        NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft','approved','published','cancelled')),
    is_recurring  BOOLEAN     NOT NULL DEFAULT TRUE,
    effective_from DATE       NOT NULL DEFAULT CURRENT_DATE,
    effective_to   DATE,
    notes         TEXT,
    created_by    INTEGER     REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_tt_dept_sem    ON timetable_entries(department_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_tt_room        ON timetable_entries(room_id);
CREATE INDEX IF NOT EXISTS idx_tt_faculty     ON timetable_entries(faculty_id);
CREATE INDEX IF NOT EXISTS idx_tt_day         ON timetable_entries(day_of_week);
CREATE INDEX IF NOT EXISTS idx_tt_status      ON timetable_entries(status);

-- ── 5. Timetable change log ───────────────────────────────────
CREATE TABLE IF NOT EXISTS timetable_changes (
    id             SERIAL      PRIMARY KEY,
    entry_id       INTEGER     NOT NULL REFERENCES timetable_entries(id) ON DELETE CASCADE,
    changed_by     INTEGER     REFERENCES users(id) ON DELETE SET NULL,
    change_type    TEXT        NOT NULL CHECK (change_type IN ('created','room_changed','time_changed','cancelled','rescheduled','approved','published')),
    old_values     JSONB,
    new_values     JSONB,
    reason         TEXT,
    changed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ttc_entry   ON timetable_changes(entry_id);
CREATE INDEX IF NOT EXISTS idx_ttc_changed ON timetable_changes(changed_at DESC);

-- ── 6. Faculty preferences ────────────────────────────────────
CREATE TABLE IF NOT EXISTS faculty_preferences (
    id             SERIAL      PRIMARY KEY,
    faculty_id     INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week    INTEGER     NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time     TIME        NOT NULL,
    end_time       TIME        NOT NULL,
    preference     TEXT        NOT NULL DEFAULT 'available'
                               CHECK (preference IN ('available','preferred','unavailable')),
    reason         TEXT,
    UNIQUE (faculty_id, day_of_week, start_time, end_time)
);

CREATE INDEX IF NOT EXISTS idx_fp_faculty ON faculty_preferences(faculty_id);

-- ── 7. Notifications ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id           SERIAL      PRIMARY KEY,
    user_id      INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type         TEXT        NOT NULL CHECK (type IN (
                               'room_assigned','room_changed','schedule_updated',
                               'class_cancelled','class_rescheduled','timetable_published',
                               'approval_required','general')),
    title        TEXT        NOT NULL,
    message      TEXT        NOT NULL,
    metadata     JSONB,
    is_read      BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user       ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notif_created    ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_type       ON notifications(type);

-- ── 8. Student section enrollment ────────────────────────────
CREATE TABLE IF NOT EXISTS student_sections (
    id            SERIAL  PRIMARY KEY,
    student_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id INTEGER NOT NULL REFERENCES departments(id),
    semester_id   INTEGER NOT NULL REFERENCES semesters(id),
    section       TEXT    NOT NULL DEFAULT 'A',
    enrolled_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, department_id, semester_id)
);

CREATE INDEX IF NOT EXISTS idx_ss_student ON student_sections(student_id);
CREATE INDEX IF NOT EXISTS idx_ss_dept_sem ON student_sections(department_id, semester_id);

-- ── 9. Updated_at trigger for timetable_entries ──────────────
DROP TRIGGER IF EXISTS tt_updated_at ON timetable_entries;
CREATE TRIGGER tt_updated_at
  BEFORE UPDATE ON timetable_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 10. Seed updated roles for existing admin user ────────────
-- (already handled by constraint change above)

COMMIT;
