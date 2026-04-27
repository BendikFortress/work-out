export interface ExerciseLog {
  completed: boolean;
  weight?: number; // kg lifted
}

export interface MacroLog {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface DayLog {
  date: string; // "YYYY-MM-DD"
  workoutCompleted: boolean;
  workoutType?: string;
  weight?: number; // bodyweight
  waist?: number;
  notes?: string;
  exerciseLogs: Record<string, ExerciseLog>; // keyed by exercise name
  macros: MacroLog;
  mealsChecked: {
    lunch: boolean;
    snack: boolean;
    dinner: boolean;
    eveningSnack: boolean;
  };
}

const STORAGE_KEY = "workout-tracker-logs";
const SETTINGS_KEY = "workout-tracker-settings";

export interface Settings {
  startDate: string;
  startWeight: number;
  targetWeight: number;
}

export function getSettings(): Settings {
  if (typeof window === "undefined") {
    return { startDate: "2026-04-28", startWeight: 82, targetWeight: 77 };
  }
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return { startDate: "2026-04-28", startWeight: 82, targetWeight: 77 };
  try {
    return JSON.parse(raw);
  } catch {
    return { startDate: "2026-04-28", startWeight: 82, targetWeight: 77 };
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getAllLogs(): Record<string, DayLog> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function getLog(date: string): DayLog {
  const all = getAllLogs();
  return (
    all[date] ?? {
      date,
      workoutCompleted: false,
      exerciseLogs: {},
      macros: {},
      mealsChecked: { lunch: false, snack: false, dinner: false, eveningSnack: false },
    }
  );
}

export function saveLog(log: DayLog): void {
  const all = getAllLogs();
  all[log.date] = log;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function getTodayString(): string {
  return formatDate(new Date());
}

export function getDateRange(startDate: string, weeks: number): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(formatDate(d));
  }
  return dates;
}

export function isPast(dateStr: string): boolean {
  return dateStr < getTodayString();
}

export function isToday(dateStr: string): boolean {
  return dateStr === getTodayString();
}
