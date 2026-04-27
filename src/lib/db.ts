import { neon } from "@neondatabase/serverless";

function sql() {
  return neon(process.env.DATABASE_URL!);
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
  const r = rows[0] as { start_date: string; start_weight: number; target_weight: number };
  return { startDate: r.start_date, startWeight: Number(r.start_weight), targetWeight: Number(r.target_weight) };
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
}

function rowToLog(r: Record<string, unknown>): DbLog {
  return {
    date: (r.date as string).split("T")[0],
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

export async function upsertLog(userId: number, date: string, data: Partial<DbLog>): Promise<void> {
  const db = sql();
  await db`
    INSERT INTO day_logs (
      user_id, date, workout_completed, workout_type, body_weight, waist,
      notes, exercise_logs, macros, meals_checked, updated_at
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
      updated_at        = NOW()
  `;
}
