"use client";

import { useState, useEffect } from "react";
import {
  WORKOUT_SESSIONS,
  WORKOUT_BADGE_COLORS,
  getWorkoutForDay,
  getWeekNumber,
  getPhaseForWeek,
  MEALS,
  CORE_TIPS,
  type WorkoutType,
} from "@/lib/plan-data";
import {
  getSettings,
  getLog,
  saveLog,
  getTodayString,
  type DayLog,
} from "@/lib/tracking";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function HomePage() {
  const [log, setLog] = useState<DayLog | null>(null);
  const [weekNumber, setWeekNumber] = useState(1);
  const [workoutType, setWorkoutType] = useState<WorkoutType>("rest");
  const [today, setToday] = useState(new Date());
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [weightInput, setWeightInput] = useState("");

  useEffect(() => {
    const now = new Date();
    setToday(now);
    const settings = getSettings();
    const week = getWeekNumber(settings.startDate, now);
    setWeekNumber(week);
    const wt = getWorkoutForDay(week, now.getDay());
    setWorkoutType(wt);
    const todayStr = getTodayString();
    const existing = getLog(todayStr);
    setLog({ ...existing, workoutType: wt });
    if (existing.weight) setWeightInput(String(existing.weight));
  }, []);

  if (!log) return <LoadingSkeleton />;

  const workout = WORKOUT_SESSIONS[workoutType];
  const phase = getPhaseForWeek(weekNumber);
  const todayStr = getTodayString();

  function toggleWorkout() {
    const updated = { ...log!, workoutCompleted: !log!.workoutCompleted };
    setLog(updated);
    saveLog(updated);
  }

  function toggleMeal(meal: keyof DayLog["mealsChecked"]) {
    const updated = {
      ...log!,
      mealsChecked: { ...log!.mealsChecked, [meal]: !log!.mealsChecked[meal] },
    };
    setLog(updated);
    saveLog(updated);
  }

  function saveWeight() {
    const w = parseFloat(weightInput);
    if (isNaN(w)) return;
    const updated = { ...log!, weight: w };
    setLog(updated);
    saveLog(updated);
    setShowWeightInput(false);
  }

  const mealKeys: (keyof DayLog["mealsChecked"])[] = ["lunch", "snack", "dinner", "eveningSnack"];
  const mealLabels = ["Lunch", "Pre-workout snack", "Dinner", "Evening snack"];
  const mealsCompleted = mealKeys.filter((k) => log.mealsChecked[k]).length;

  const isRest = workoutType === "rest";

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
      {/* Header */}
      <div>
        <p className="text-zinc-500 text-sm">
          {DAY_NAMES[today.getDay()]}, {today.getDate()} {MONTH_NAMES[today.getMonth()]}
        </p>
        <h1 className="text-2xl font-bold mt-0.5">Today</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
            Week {weekNumber} / 9
          </span>
          <span className="text-xs text-zinc-500 truncate">{phase.label}</span>
        </div>
      </div>

      {/* Workout Card */}
      <section className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
        <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full mb-2 ${WORKOUT_BADGE_COLORS[workoutType]}`}>
              {workoutType.toUpperCase()}
            </div>
            <h2 className="text-lg font-bold leading-tight">{workout.label}</h2>
            {workout.duration > 0 && (
              <p className="text-zinc-500 text-sm mt-0.5">{workout.duration} min</p>
            )}
            {workout.notes && (
              <p className="text-zinc-400 text-sm mt-1">{workout.notes}</p>
            )}
          </div>
          {!isRest && (
            <button
              onClick={toggleWorkout}
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                log.workoutCompleted
                  ? "bg-emerald-500 text-white"
                  : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
              }`}
            >
              <CheckIcon />
            </button>
          )}
        </div>

        {workout.exercises && workout.exercises.length > 0 && (
          <div className="border-t border-zinc-800">
            {workout.exercises.map((ex, i) => (
              <div
                key={i}
                className={`flex justify-between items-center px-4 py-2.5 ${
                  i !== workout.exercises!.length - 1 ? "border-b border-zinc-800/60" : ""
                }`}
              >
                <span className="text-sm text-zinc-200">{ex.name}</span>
                <span className="text-sm text-zinc-500 font-mono ml-4 flex-shrink-0">{ex.sets}</span>
              </div>
            ))}
          </div>
        )}

        {isRest && (
          <div className="border-t border-zinc-800 px-4 py-3">
            <p className="text-zinc-500 text-sm">Hit your protein target and stay hydrated.</p>
          </div>
        )}
      </section>

      {/* Core Tips (if it's a weights session) */}
      {["push","pull","legs","full","upper","lower"].includes(workoutType) && (
        <section className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Core focus</h3>
          <ul className="space-y-2">
            {CORE_TIPS.slice(0, 2).map((tip, i) => (
              <li key={i} className="flex gap-2 text-sm text-zinc-300">
                <span className="text-zinc-600 mt-0.5">→</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Meals */}
      <section className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
          <h3 className="font-semibold">Meals today</h3>
          <span className="text-xs text-zinc-500">{mealsCompleted}/{mealKeys.length} checked</span>
        </div>
        <div className="border-t border-zinc-800">
          {mealKeys.map((key, i) => {
            const meal = MEALS[i];
            const checked = log.mealsChecked[key];
            return (
              <button
                key={key}
                onClick={() => toggleMeal(key)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-800/50 ${
                  i !== mealKeys.length - 1 ? "border-b border-zinc-800/60" : ""
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center border transition-all ${
                  checked ? "bg-emerald-500 border-emerald-500" : "border-zinc-600"
                }`}>
                  {checked && <CheckIcon size={12} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${checked ? "text-zinc-500 line-through" : "text-zinc-200"}`}>
                    {mealLabels[i]}
                    {meal.optional && <span className="text-zinc-600 font-normal"> (optional)</span>}
                  </p>
                  <p className="text-xs text-zinc-600">{meal.time} · ~{meal.calories} kcal</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Log weight */}
      <section className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">Morning weight</h3>
            <p className="text-xs text-zinc-600 mt-0.5">After toilet, before food</p>
          </div>
          {log.weight ? (
            <button
              onClick={() => setShowWeightInput(true)}
              className="text-lg font-bold text-white hover:text-zinc-300 transition-colors"
            >
              {log.weight} kg
            </button>
          ) : (
            <button
              onClick={() => setShowWeightInput(true)}
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors border border-zinc-700 rounded-lg px-3 py-1.5"
            >
              + Log weight
            </button>
          )}
        </div>
        {showWeightInput && (
          <div className="mt-3 flex gap-2">
            <input
              type="number"
              step="0.1"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder="82.0"
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && saveWeight()}
            />
            <span className="flex items-center text-sm text-zinc-500">kg</span>
            <button
              onClick={saveWeight}
              className="bg-white text-black text-sm font-medium px-4 py-2 rounded-lg hover:bg-zinc-200 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => setShowWeightInput(false)}
              className="text-zinc-500 hover:text-zinc-300 text-sm px-2"
            >
              ✕
            </button>
          </div>
        )}
      </section>

      {/* Macros reminder */}
      <section className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Daily targets</h3>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Calories", value: "2,000", unit: "kcal", color: "text-white" },
            { label: "Protein", value: "185g", unit: "", color: "text-blue-400" },
            { label: "Carbs", value: "175g", unit: "", color: "text-amber-400" },
            { label: "Fat", value: "60g", unit: "", color: "text-rose-400" },
          ].map((m) => (
            <div key={m.label} className="bg-zinc-800/60 rounded-xl p-2.5 text-center">
              <p className={`text-base font-bold ${m.color}`}>{m.value}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 8 6.5 11.5 13 5" />
    </svg>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-lg mx-auto px-4 pt-6 space-y-5 animate-pulse">
      <div className="h-16 bg-zinc-900 rounded-xl" />
      <div className="h-64 bg-zinc-900 rounded-2xl" />
      <div className="h-48 bg-zinc-900 rounded-2xl" />
    </div>
  );
}
