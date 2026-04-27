export type WorkoutType = "push" | "pull" | "legs" | "full" | "upper" | "lower" | "hiit" | "cardio" | "walk" | "active" | "rest";

export interface Exercise {
  name: string;
  sets: string;
}

export interface WorkoutSession {
  type: WorkoutType;
  label: string;
  duration: number; // minutes
  exercises?: Exercise[];
  notes?: string;
}

export interface DaySchedule {
  mon: WorkoutType;
  tue: WorkoutType;
  wed: WorkoutType;
  thu: WorkoutType;
  fri: WorkoutType;
  sat: WorkoutType;
  sun: WorkoutType;
}

export interface Phase {
  weeks: string;
  label: string;
  description: string;
  schedule: DaySchedule;
}

export interface MacroTarget {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Milestone {
  week: number;
  weight: string;
  note: string;
}

export const PLAN_START_DATE = "2026-04-28"; // Monday — adjust to actual start date

export const PHASES: Phase[] = [
  {
    weeks: "1–3",
    label: "Foundation + metabolic activation",
    description: "Establish training rhythm, dial in nutrition, build aerobic base. 4 lifts + 3 moderate cardio sessions/week.",
    schedule: { mon: "push", tue: "cardio", wed: "pull", thu: "walk", fri: "legs", sat: "cardio", sun: "full" },
  },
  {
    weeks: "4–6",
    label: "Fat burning intensification",
    description: "Add HIIT, increase training density, introduce supersets. Calorie intake drops slightly.",
    schedule: { mon: "push", tue: "hiit", wed: "pull", thu: "cardio", fri: "legs", sat: "hiit", sun: "full" },
  },
  {
    weeks: "7–9",
    label: "Definition + peak conditioning",
    description: "Maximum fat mobilisation. Shorter rest periods, circuit-style lifting, daily activity. Carb cycling kicks in.",
    schedule: { mon: "upper", tue: "hiit", wed: "lower", thu: "cardio", fri: "full", sat: "hiit", sun: "active" },
  },
];

export const WORKOUT_SESSIONS: Record<WorkoutType, WorkoutSession> = {
  push: {
    type: "push",
    label: "Push — chest, shoulders, triceps",
    duration: 60,
    exercises: [
      { name: "Bench press", sets: "4 × 8–10" },
      { name: "Incline dumbbell press", sets: "3 × 10–12" },
      { name: "Lateral raises", sets: "4 × 15" },
      { name: "Overhead press (machine)", sets: "3 × 10" },
      { name: "Tricep rope pushdown", sets: "3 × 12–15" },
      { name: "Cable flyes (superset above)", sets: "3 × 12" },
    ],
  },
  pull: {
    type: "pull",
    label: "Pull — back, biceps, rear delts",
    duration: 60,
    exercises: [
      { name: "Barbell or cable row", sets: "4 × 8–10" },
      { name: "Lat pulldown", sets: "4 × 10–12" },
      { name: "Seated cable row", sets: "3 × 12" },
      { name: "Face pulls", sets: "3 × 15" },
      { name: "Dumbbell curl", sets: "3 × 12" },
      { name: "Hammer curl", sets: "2 × 15" },
    ],
  },
  legs: {
    type: "legs",
    label: "Legs — quads, hamstrings, glutes",
    duration: 60,
    exercises: [
      { name: "Barbell squat", sets: "4 × 8" },
      { name: "Romanian deadlift", sets: "3 × 10" },
      { name: "Leg press", sets: "3 × 12" },
      { name: "Walking lunges", sets: "3 × 12/leg" },
      { name: "Leg curl", sets: "3 × 12" },
      { name: "Calf raises", sets: "4 × 20" },
    ],
  },
  full: {
    type: "full",
    label: "Full body + core",
    duration: 50,
    exercises: [
      { name: "Deadlift or trap bar DL", sets: "4 × 6" },
      { name: "Dumbbell shoulder press", sets: "3 × 10" },
      { name: "Cable row", sets: "3 × 12" },
      { name: "Plank", sets: "3 × 45–60 sec" },
      { name: "Ab wheel / hanging leg raises", sets: "3 × 12–15" },
      { name: "Russian twists", sets: "3 × 20" },
    ],
  },
  upper: {
    type: "upper",
    label: "Upper body",
    duration: 60,
    exercises: [
      { name: "Bench press", sets: "4 × 8–10" },
      { name: "Barbell or cable row", sets: "4 × 8–10" },
      { name: "Overhead press (machine)", sets: "3 × 10" },
      { name: "Lat pulldown", sets: "3 × 10–12" },
      { name: "Lateral raises", sets: "3 × 15" },
      { name: "Face pulls", sets: "3 × 15" },
    ],
  },
  lower: {
    type: "lower",
    label: "Lower body",
    duration: 60,
    exercises: [
      { name: "Barbell squat", sets: "4 × 8" },
      { name: "Romanian deadlift", sets: "3 × 10" },
      { name: "Leg press", sets: "3 × 12" },
      { name: "Walking lunges", sets: "3 × 12/leg" },
      { name: "Leg curl", sets: "3 × 12" },
      { name: "Calf raises", sets: "4 × 20" },
    ],
  },
  hiit: {
    type: "hiit",
    label: "HIIT session",
    duration: 30,
    exercises: [
      { name: "Warm-up", sets: "5 min easy" },
      { name: "Sprint / bike sprints", sets: "20 sec on / 40 sec off" },
      { name: "Rounds", sets: "10–15 rounds" },
      { name: "Cool-down", sets: "5 min easy" },
    ],
  },
  cardio: {
    type: "cardio",
    label: "Steady-state cardio",
    duration: 45,
    notes: "Zone 2 (130–145 bpm). Treadmill incline walk / bike / row.",
    exercises: [
      { name: "Treadmill incline walk / bike / row", sets: "40–50 min" },
      { name: "Target heart rate", sets: "130–145 bpm (Zone 2)" },
    ],
  },
  walk: {
    type: "walk",
    label: "Walk / active recovery",
    duration: 45,
    notes: "Brisk 30–60 min walk. Keep it easy — this is recovery, not extra cardio.",
    exercises: [
      { name: "Brisk walk outdoors", sets: "30–60 min" },
    ],
  },
  active: {
    type: "active",
    label: "Active recovery",
    duration: 30,
    notes: "Light movement — walk, yoga, mobility. No structured lifting.",
    exercises: [
      { name: "Walk / yoga / mobility", sets: "30–60 min" },
    ],
  },
  rest: {
    type: "rest",
    label: "Rest day",
    duration: 0,
    notes: "Full rest. Stay hydrated, hit your protein target.",
  },
};

export const NUTRITION: MacroTarget = {
  calories: 2000,
  protein: 185,
  carbs: 175,
  fat: 60,
};

export const MEALS = [
  {
    time: "12:00pm",
    label: "Lunch",
    calories: 550,
    items: [
      { name: "4 slices wholegrain / rye bread", detail: "40g carbs" },
      { name: "150g turkey breast slices", detail: "30g protein" },
      { name: "100g ham or roast beef slices", detail: "20g protein" },
      { name: "Mustard / pickles (condiments)", detail: "~0 kcal" },
    ],
  },
  {
    time: "4:00pm",
    label: "Pre-workout snack",
    calories: 300,
    items: [
      { name: "Greek yoghurt (200g, full fat)", detail: "20g protein" },
      { name: "Banana or handful of rice cakes", detail: "30g carbs" },
      { name: "Whey shake (optional if protein low)", detail: "25g protein" },
    ],
  },
  {
    time: "7:00pm",
    label: "Dinner",
    calories: 750,
    items: [
      { name: "250g chicken breast / salmon / lean beef", detail: "50g protein" },
      { name: "150g rice / sweet potato / pasta", detail: "40g carbs" },
      { name: "Large portion vegetables (broccoli, peppers, courgette)", detail: "fibre" },
      { name: "1 tbsp olive oil for cooking", detail: "healthy fat" },
    ],
  },
  {
    time: "9:00pm",
    label: "Evening snack",
    calories: 150,
    optional: true,
    items: [
      { name: "Cottage cheese or casein shake", detail: "25g protein" },
    ],
  },
];

export const MILESTONES: Milestone[] = [
  { week: 3, weight: "~80–81 kg", note: "2–3 cm waist reduction" },
  { week: 6, weight: "~78–79 kg", note: "Visible abs starting" },
  { week: 9, weight: "~76–78 kg", note: "Defined waist, muscle visible" },
];

export const SUPPLEMENTS = [
  { name: "Whey protein", note: "Easiest way to hit 185g/day without over-eating" },
  { name: "Creatine monohydrate (5g/day)", note: "Maintains strength and muscle volume during a cut" },
  { name: "Caffeine", note: "Pre-workout performance and mild fat oxidation boost" },
  { name: "Omega-3 (fish oil)", note: "Reduces inflammation, improves insulin sensitivity" },
];

export const CORE_TIPS = [
  "Core work 4×/week at the end of sessions — not as the primary focus (fat loss is systemic, not spot-reducible)",
  "Prioritise compound lifts: deadlifts, squats and rows engage the deep core more than crunches",
  "Add vacuum exercises (stomach hollowing) daily — shown to reduce waist circumference",
  "Face pulls and lateral raises build shoulder width which visually narrows the waist",
];

export const STALL_TIPS = [
  { trigger: "No weight loss for 2 weeks?", action: "Add 1 LISS cardio session or cut 100–150 kcal from carbs" },
  { trigger: "Losing faster than 1 kg/week?", action: "Add 150 kcal (mostly carbs) — protect your muscle" },
  { trigger: "Energy crashing badly?", action: "Schedule a maintenance refeed day before cutting again" },
  { trigger: "Strength dropping significantly?", action: "You may be under-eating protein — track it for a week" },
];

export const DAY_KEYS: (keyof DaySchedule)[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const DAY_LABELS: Record<keyof DaySchedule, string> = {
  mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
};

export function getPhaseForWeek(weekNumber: number): Phase {
  if (weekNumber <= 3) return PHASES[0];
  if (weekNumber <= 6) return PHASES[1];
  return PHASES[2];
}

export function getWorkoutForDay(weekNumber: number, dayOfWeek: number): WorkoutType {
  // dayOfWeek: 0=Sun, 1=Mon, ..., 6=Sat
  const phase = getPhaseForWeek(weekNumber);
  const keys: (keyof DaySchedule)[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const key = keys[dayOfWeek];
  return phase.schedule[key];
}

export function getWeekNumber(startDate: string, currentDate: Date): number {
  const start = new Date(startDate);
  const diff = currentDate.getTime() - start.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.min(9, Math.floor(days / 7) + 1));
}

export const WORKOUT_COLORS: Record<WorkoutType, string> = {
  push: "bg-blue-600 text-white",
  pull: "bg-blue-500 text-white",
  legs: "bg-blue-700 text-white",
  full: "bg-blue-800 text-white",
  upper: "bg-blue-600 text-white",
  lower: "bg-blue-700 text-white",
  hiit: "bg-rose-500 text-white",
  cardio: "bg-emerald-600 text-white",
  walk: "bg-amber-500 text-white",
  active: "bg-amber-400 text-white",
  rest: "bg-zinc-600 text-white",
};

export const WORKOUT_BADGE_COLORS: Record<WorkoutType, string> = {
  push: "bg-blue-900/40 text-blue-300 border border-blue-700/50",
  pull: "bg-blue-900/40 text-blue-300 border border-blue-700/50",
  legs: "bg-blue-900/40 text-blue-300 border border-blue-700/50",
  full: "bg-blue-900/40 text-blue-300 border border-blue-700/50",
  upper: "bg-blue-900/40 text-blue-300 border border-blue-700/50",
  lower: "bg-blue-900/40 text-blue-300 border border-blue-700/50",
  hiit: "bg-rose-900/40 text-rose-300 border border-rose-700/50",
  cardio: "bg-emerald-900/40 text-emerald-300 border border-emerald-700/50",
  walk: "bg-amber-900/40 text-amber-300 border border-amber-700/50",
  active: "bg-amber-900/40 text-amber-300 border border-amber-700/50",
  rest: "bg-zinc-800 text-zinc-400 border border-zinc-700",
};
