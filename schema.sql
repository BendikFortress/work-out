-- Run this once against your Neon database to set up the schema.
-- You can run it in the Neon SQL editor or via psql.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id       INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  start_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  start_weight  NUMERIC(5, 2) DEFAULT 82,
  target_weight NUMERIC(5, 2) DEFAULT 77,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS day_logs (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date              DATE NOT NULL,
  workout_completed BOOLEAN DEFAULT FALSE,
  workout_type      TEXT,
  body_weight       NUMERIC(5, 2),
  waist             NUMERIC(5, 2),
  notes             TEXT,
  exercise_logs     JSONB DEFAULT '{}',
  macros            JSONB DEFAULT '{}',
  meals_checked     JSONB DEFAULT '{"lunch":false,"snack":false,"dinner":false,"eveningSnack":false}',
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, date)
);
