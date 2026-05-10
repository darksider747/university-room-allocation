-- ============================================================
-- UOM Room Allocation System v2.0 — PostgreSQL Schema
-- ============================================================

BEGIN;

-- ── EXTENSION ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── USERS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL      PRIMARY KEY,
    name          TEXT        NOT NULL,
    email         TEXT        NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    role          TEXT        NOT NULL DEFAULT 'student'
                              CHECK (role IN ('admin', 'student')),
    department    TEXT,
    is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email  ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role   ON users(role);

-- ── ROOMS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rooms (
    id          SERIAL PRIMARY KEY,
    room_number TEXT   NOT NULL UNIQUE,
    capacity    INTEGER NOT NULL DEFAULT 40 CHECK (capacity > 0),
    building    TEXT   NOT NULL DEFAULT 'Main Block',
    floor       INTEGER NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms(is_active);

-- ── DEPARTMENTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
    id   SERIAL PRIMARY KEY,
    name TEXT   NOT NULL UNIQUE
);

-- ── SEMESTERS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS semesters (
    id              SERIAL  PRIMARY KEY,
    label           TEXT    NOT NULL UNIQUE,
    year            INTEGER NOT NULL,
    semester_number INTEGER NOT NULL CHECK (semester_number BETWEEN 1 AND 8),
    UNIQUE (year, semester_number)
);

-- ── BOOKING QUEUE (FIFO) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_queue (
    id               SERIAL      PRIMARY KEY,
    user_id          INTEGER     REFERENCES users(id) ON DELETE SET NULL,
    department       TEXT        NOT NULL,
    semester_id      INTEGER     NOT NULL REFERENCES semesters(id),
    lecture_name     TEXT        NOT NULL,
    booking_date     DATE        NOT NULL,
    start_time       TIME        NOT NULL,
    end_time         TIME        NOT NULL,
    specific_room_id INTEGER     REFERENCES rooms(id),
    queued_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status           TEXT        NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending','allocated','failed')),
    notes            TEXT,
    CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_bq_status    ON booking_queue(status);
CREATE INDEX IF NOT EXISTS idx_bq_queued_at ON booking_queue(queued_at);
CREATE INDEX IF NOT EXISTS idx_bq_user_id   ON booking_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_bq_date      ON booking_queue(booking_date);

-- ── ALLOCATIONS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS allocations (
    id           SERIAL      PRIMARY KEY,
    room_id      INTEGER     NOT NULL REFERENCES rooms(id),
    queue_id     INTEGER     REFERENCES booking_queue(id),
    user_id      INTEGER     REFERENCES users(id) ON DELETE SET NULL,
    department   TEXT        NOT NULL,
    semester_id  INTEGER     NOT NULL REFERENCES semesters(id),
    lecture_name TEXT        NOT NULL,
    booking_date DATE        NOT NULL,
    start_time   TIME        NOT NULL,
    end_time     TIME        NOT NULL,
    allocated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_alloc_room_date ON allocations(room_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_alloc_dept      ON allocations(department);
CREATE INDEX IF NOT EXISTS idx_alloc_user      ON allocations(user_id);
CREATE INDEX IF NOT EXISTS idx_alloc_date      ON allocations(booking_date);
CREATE INDEX IF NOT EXISTS idx_alloc_semester  ON allocations(semester_id);

-- ── DEPARTMENT SEMESTER USAGE ────────────────────────────────
CREATE TABLE IF NOT EXISTS department_semester_usage (
    id              SERIAL  PRIMARY KEY,
    department      TEXT    NOT NULL,
    semester_id     INTEGER NOT NULL REFERENCES semesters(id),
    allocated_count INTEGER NOT NULL DEFAULT 0 CHECK (allocated_count >= 0),
    max_limit       INTEGER NOT NULL DEFAULT 16,
    UNIQUE (department, semester_id)
);

-- ── ACTIVITY LOGS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
    id        SERIAL      PRIMARY KEY,
    user_id   INTEGER     REFERENCES users(id) ON DELETE SET NULL,
    message   TEXT        NOT NULL,
    type      TEXT        NOT NULL DEFAULT 'info'
                          CHECK (type IN ('info','success','error','warning')),
    metadata  JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_ts      ON activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_type    ON activity_logs(type);

-- ── UPDATED_AT TRIGGER ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMIT;
