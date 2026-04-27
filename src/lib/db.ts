import { neon } from "@neondatabase/serverless";
import { getWorkoutForDay } from "@/lib/plan-data";

function sql() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  return neon(process.env.DATABASE_URL);
}

// ─── Auto-migration ───────────────────────────────────────────────────────────
// Runs CREATE TABLE IF NOT EXISTS on the first request per cold start.

let migrated = false;

export async function ensureTables(): Promise<void> {
  if (migrated) return;
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id       INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      start_date    DATE NOT NULL DEFAULT CURRENT_DATE,
      start_weight  NUMERIC(5, 2) DEFAULT 82,
      target_weight NUMERIC(5, 2) DEFAULT 77,
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await db`
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
    )
  `;
  // Add new columns to existing tables (safe to re-run)
  await db`ALTER TABLE day_logs ADD COLUMN IF NOT EXISTS workout_rating SMALLINT`;
  await db`ALTER TABLE day_logs ADD COLUMN IF NOT EXISTS feeling_score SMALLINT`;

  migrated = true;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normalise a date value returned by Neon (Date object or string) to YYYY-MM-DD.
 *
 * Neon's driver constructs Date objects from PostgreSQL DATE columns using
 * *local* midnight (e.g. 2026-04-27T00:00:00+02:00). Calling toISOString()
 * on that gives the UTC representation (2026-04-26T22:00:00Z) → wrong day.
 * Using getFullYear/Month/Date (local components) always gives the intended
 * calendar date regardless of the server's UTC offset.
 */
function toDateStr(value: unknown): string {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  // Plain string e.g. "2026-04-27" or "2026-04-27T00:00:00Z" — take first 10 chars
  return String(value).slice(0, 10);
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function getUserByEmail(email: string) {
  const db = sql();
  const rows = await db`
    SELECT id, email, password_hash FROM users WHERE email = ${email}
  `;
  return (rows[0] as { id: number; email: string; password_hash: string }) ?? null;
}

export async function createUser(email: string, passwordHash: string): Promise<number> {
  const db = sql();
  const rows = await db`
    INSERT INTO users (email, password_hash)
    VALUES (${email}, ${passwordHash})
    RETURNING id
  `;
  return (rows[0] as { id: number }).id;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface DbSettings {
  startDate: string;
  startWeight: number;
  targetWeight: number;
}

export async function getSettings(userId: number): Promise<DbSettings> {
  const db = sql();
  const rows = await db`
    SELECT start_date, start_weight, target_weight
    FROM user_settings WHERE user_id = ${userId}
  `;
  if (!rows[0]) {
    return { startDate: new Date().toISOString().split("T")[0], startWeight: 82, targetWeight: 77 };
  }
  const r = rows[0] as { start_date: unknown; start_weight: unknown; target_weight: unknown };
  return {
    startDate: toDateStr(r.start_date),
    startWeight: Number(r.start_weight),
    targetWeight: Number(r.target_weight),
  };
}

export async function upsertSettings(userId: number, data: DbSettings): Promise<void> {
  const db = sql();
  await db`
    INSERT INTO user_settings (user_id, start_date, start_weight, target_weight)
    VALUES (${userId}, ${data.startDate}, ${data.startWeight}, ${data.targetWeight})
    ON CONFLICT (user_id) DO UPDATE SET
      start_date    = EXCLUDED.start_date,
      start_weight  = EXCLUDED.start_weight,
      target_weight = EXCLUDED.target_weight,
      updated_at    = NOW()
  `;
}

// ─── Day logs ─────────────────────────────────────────────────────────────────

export interface DbLog {
  date: string;
  workoutCompleted: boolean;
  workoutType: string | null;
  bodyWeight: number | null;
  waist: number | null;
  notes: string | null;
  exerciseLogs: Record<string, unknown>;
  macros: Record<string, unknown>;
  mealsChecked: Record<string, boolean>;
  workoutRating: number | null;
  feelingScore: number | null;
}

function rowToLog(r: Record<string, unknown>): DbLog {
  return {
    date: toDateStr(r.date),
    workoutCompleted: Boolean(r.workout_completed),
    workoutType: (r.workout_type as string | null) ?? null,
    bodyWeight: r.body_weight != null ? Number(r.body_weight) : null,
    waist: r.waist != null ? Number(r.waist) : null,
    notes: (r.notes as string | null) ?? null,
    exerciseLogs: (r.exercise_logs as Record<string, unknown>) ?? {},
    macros: (r.macros as Record<string, unknown>) ?? {},
    mealsChecked: (r.meals_checked as Record<string, boolean>) ?? {
      lunch: false, snack: false, dinner: false, eveningSnack: false,
    },
    workoutRating: r.workout_rating != null ? Number(r.workout_rating) : null,
    feelingScore: r.feeling_score != null ? Number(r.feeling_score) : null,
  };
}

export async function getLog(userId: number, date: string): Promise<DbLog | null> {
  const db = sql();
  const rows = await db`
    SELECT * FROM day_logs WHERE user_id = ${userId} AND date = ${date}
  `;
  return rows[0] ? rowToLog(rows[0] as Record<string, unknown>) : null;
}

export async function getAllLogs(userId: number): Promise<DbLog[]> {
  const db = sql();
  const rows = await db`
    SELECT * FROM day_logs WHERE user_id = ${userId} ORDER BY date ASC
  `;
  return rows.map((r) => rowToLog(r as Record<string, unknown>));
}

/**
 * Pre-populate all 63 days of the plan with the correct workout_type.
 * Uses ON CONFLICT DO UPDATE SET workout_type only — never overwrites
 * exercise_logs, macros, or any other user data.
 */
export async function initPlanSchedule(userId: number, startDate: string): Promise<void> {
  const db = sql();
  for (let i = 0; i < 63; i++) {
    // Use UTC noon to stay in the same calendar date regardless of server TZ
    const d = new Date(startDate + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const weekNum = Math.floor(i / 7) + 1;
    const dayOfWeek = d.getUTCDay(); // 0=Sun … 6=Sat
    const workoutType = getWorkoutForDay(weekNum, dayOfWeek);

    await db`
      INSERT INTO day_logs (user_id, date, workout_type)
      VALUES (${userId}, ${dateStr}, ${workoutType})
      ON CONFLICT (user_id, date) DO UPDATE SET
        workout_type = EXCLUDED.workout_type
    `;
  }
}

export async function upsertLog(userId: number, date: string, data: Partial<DbLog>): Promise<void> {
  const db = sql();
  await db`
    INSERT INTO day_logs (
      user_id, date, workout_completed, workout_type, body_weight, waist,
      notes, exercise_logs, macros, meals_checked, workout_rating, feeling_score, updated_at
    ) VALUES (
      ${userId}, ${date},
      ${data.workoutCompleted ?? false},
      ${data.workoutType ?? null},
      ${data.bodyWeight ?? null},
      ${data.waist ?? null},
      ${data.notes ?? null},
      ${JSON.stringify(data.exerciseLogs ?? {})}::jsonb,
      ${JSON.stringify(data.macros ?? {})}::jsonb,
      ${JSON.stringify(data.mealsChecked ?? { lunch: false, snack: false, dinner: false, eveningSnack: false })}::jsonb,
      ${data.workoutRating ?? null},
      ${data.feelingScore ?? null},
      NOW()
    )
    ON CONFLICT (user_id, date) DO UPDATE SET
      workout_completed = EXCLUDED.workout_completed,
      workout_type      = EXCLUDED.workout_type,
      body_weight       = EXCLUDED.body_weight,
      waist             = EXCLUDED.waist,
      notes             = EXCLUDED.notes,
      exercise_logs     = EXCLUDED.exercise_logs,
      macros            = EXCLUDED.macros,
      meals_checked     = EXCLUDED.meals_checked,
      workout_rating    = EXCLUDED.workout_rating,
      feeling_score     = EXCLUDED.feeling_score,
      updated_at        = NOW()
  `;
}
