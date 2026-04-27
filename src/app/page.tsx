"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  WORKOUT_SESSIONS,
  WORKOUT_BADGE_COLORS,
  getWorkoutForDay,
  getWeekNumber,
  getPhaseForWeek,
  MEALS,
  CORE_TIPS,
  type WorkoutType,
  type Exercise,
} from "@/lib/plan-data";
import type { DayLog, MacroLog, ExerciseLog } from "@/lib/tracking";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEIGHTS_TYPES: WorkoutType[] = ["push", "pull", "legs", "full", "upper", "lower"];

const EMPTY_LOG: Omit<DayLog, "date"> = {
  workoutCompleted: false,
  exerciseLogs: {},
  macros: {},
  mealsChecked: { lunch: false, snack: false, dinner: false, eveningSnack: false },
};

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function HomePage() {
  const [log, setLog] = useState<DayLog | null>(null);
  const [weekNumber, setWeekNumber] = useState(1);
  const [workoutType, setWorkoutType] = useState<WorkoutType>("rest");
  const [today, setToday] = useState(new Date());
  const [showBodyWeightInput, setShowBodyWeightInput] = useState(false);
  const [bodyWeightInput, setBodyWeightInput] = useState("");
  const [activeWeightInput, setActiveWeightInput] = useState<string | null>(null);
  const [weightInputValue, setWeightInputValue] = useState("");
  const weightRef = useRef<HTMLInputElement>(null);
  const [editingMacros, setEditingMacros] = useState(false);
  const [macroInputs, setMacroInputs] = useState<MacroLog>({});

  // Load settings + today's log from API
  useEffect(() => {
    const now = new Date();
    setToday(now);

    async function load() {
      const [settingsRes, logRes] = await Promise.all([
        fetch("/api/settings"),
        fetch(`/api/logs/${todayStr()}`),
      ]);
      const settings = await settingsRes.json();
      const week = getWeekNumber(settings.startDate, now);
      setWeekNumber(week);
      const wt = getWorkoutForDay(week, now.getDay());
      setWorkoutType(wt);

      const rawLog = logRes.ok ? await logRes.json() : null;
      const base: DayLog = {
        date: todayStr(),
        ...EMPTY_LOG,
        workoutType: wt,
      };

      if (rawLog) {
        // Map DB field names to DayLog shape
        const merged: DayLog = {
          ...base,
          workoutCompleted: rawLog.workoutCompleted ?? false,
          workoutType: rawLog.workoutType ?? wt,
          weight: rawLog.bodyWeight ?? undefined,
          exerciseLogs: rawLog.exerciseLogs ?? {},
          macros: rawLog.macros ?? {},
          mealsChecked: rawLog.mealsChecked ?? base.mealsChecked,
        };
        setLog(merged);
        if (merged.weight) setBodyWeightInput(String(merged.weight));
        if (merged.macros) setMacroInputs(merged.macros);
      } else {
        setLog(base);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (activeWeightInput && weightRef.current) weightRef.current.focus();
  }, [activeWeightInput]);

  // Persist to API (optimistic — fires in background)
  const persist = useCallback((updated: DayLog) => {
    fetch(`/api/logs/${todayStr()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
  }, []);

  function updateLog(updated: DayLog) {
    setLog(updated);
    persist(updated);
  }

  if (!log) return <LoadingSkeleton />;

  const workout = WORKOUT_SESSIONS[workoutType];
  const phase = getPhaseForWeek(weekNumber);
  const isRest = workoutType === "rest";
  const isWeightsSession = WEIGHTS_TYPES.includes(workoutType);

  function toggleExercise(exName: string, exercises: Exercise[]) {
    const current = log!.exerciseLogs[exName] ?? { completed: false };
    const updatedLogs = {
      ...log!.exerciseLogs,
      [exName]: { ...current, completed: !current.completed },
    };
    const allDone = exercises.every((ex) => updatedLogs[ex.name]?.completed);
    updateLog({ ...log!, exerciseLogs: updatedLogs, workoutCompleted: allDone || log!.workoutCompleted });
  }

  function openWeightInput(exName: string) {
    const existing = log!.exerciseLogs[exName]?.weight;
    setWeightInputValue(existing != null ? String(existing) : "");
    setActiveWeightInput(exName);
  }

  function saveExerciseWeight(exName: string) {
    const w = parseFloat(weightInputValue);
    const current = log!.exerciseLogs[exName] ?? { completed: false };
    const updatedLogs = {
      ...log!.exerciseLogs,
      [exName]: { ...current, weight: isNaN(w) ? undefined : w },
    };
    updateLog({ ...log!, exerciseLogs: updatedLogs });
    setActiveWeightInput(null);
    setWeightInputValue("");
  }

  function toggleWorkoutOverride() {
    updateLog({ ...log!, workoutCompleted: !log!.workoutCompleted });
  }

  function toggleMeal(meal: keyof DayLog["mealsChecked"]) {
    updateLog({ ...log!, mealsChecked: { ...log!.mealsChecked, [meal]: !log!.mealsChecked[meal] } });
  }

  function saveBodyWeight() {
    const w = parseFloat(bodyWeightInput);
    if (isNaN(w)) return;
    updateLog({ ...log!, weight: w });
    setShowBodyWeightInput(false);
  }

  function saveMacros() {
    const cleaned: MacroLog = {
      calories: macroInputs.calories != null && !isNaN(macroInputs.calories) ? macroInputs.calories : undefined,
      protein: macroInputs.protein != null && !isNaN(macroInputs.protein) ? macroInputs.protein : undefined,
      carbs: macroInputs.carbs != null && !isNaN(macroInputs.carbs) ? macroInputs.carbs : undefined,
      fat: macroInputs.fat != null && !isNaN(macroInputs.fat) ? macroInputs.fat : undefined,
    };
    updateLog({ ...log!, macros: cleaned });
    setEditingMacros(false);
  }

  const mealKeys: (keyof DayLog["mealsChecked"])[] = ["lunch", "snack", "dinner", "eveningSnack"];
  const mealLabels = ["Lunch", "Pre-workout snack", "Dinner", "Evening snack"];
  const mealsCompleted = mealKeys.filter((k) => log.mealsChecked[k]).length;
  const exercisesDone = workout.exercises?.filter((ex) => log.exerciseLogs[ex.name]?.completed).length ?? 0;
  const exercisesTotal = workout.exercises?.length ?? 0;

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
            <div className="flex items-center gap-3 mt-1">
              {workout.duration > 0 && (
                <span className="text-zinc-500 text-sm">{workout.duration} min</span>
              )}
              {exercisesTotal > 0 && (
                <span className="text-zinc-600 text-sm">{exercisesDone}/{exercisesTotal} done</span>
              )}
            </div>
            {workout.notes && <p className="text-zinc-400 text-sm mt-1">{workout.notes}</p>}
          </div>
          {!isRest && (
            <button
              onClick={toggleWorkoutOverride}
              title={log.workoutCompleted ? "Mark incomplete" : "Mark all done"}
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                log.workoutCompleted ? "bg-emerald-500 text-white" : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
              }`}
            >
              <CheckIcon />
            </button>
          )}
        </div>

        {workout.exercises && workout.exercises.length > 0 && (
          <div className="border-t border-zinc-800">
            {workout.exercises.map((ex, i) => {
              const exLog: ExerciseLog = log.exerciseLogs[ex.name] ?? { completed: false };
              const isLast = i === workout.exercises!.length - 1;
              const inputOpen = activeWeightInput === ex.name;

              return (
                <div key={ex.name} className={!isLast ? "border-b border-zinc-800/60" : ""}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      onClick={() => toggleExercise(ex.name, workout.exercises!)}
                      className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                        exLog.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-zinc-600 hover:border-zinc-400"
                      }`}
                    >
                      {exLog.completed && <CheckIcon size={10} />}
                    </button>
                    <span className={`flex-1 text-sm transition-colors ${exLog.completed ? "text-zinc-500 line-through" : "text-zinc-200"}`}>
                      {ex.name}
                    </span>
                    {isWeightsSession && (
                      <button
                        onClick={() => openWeightInput(ex.name)}
                        className={`flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${
                          exLog.weight != null
                            ? "bg-blue-900/40 text-blue-300 border border-blue-700/50 hover:bg-blue-900/60"
                            : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
                        }`}
                      >
                        {exLog.weight != null ? `${exLog.weight} kg` : "+ kg"}
                      </button>
                    )}
                    <span className={`flex-shrink-0 text-sm font-mono ml-1 ${exLog.completed ? "text-zinc-600" : "text-zinc-500"}`}>
                      {ex.sets}
                    </span>
                  </div>
                  {inputOpen && (
                    <div className="px-4 pb-3 flex items-center gap-2">
                      <input
                        ref={weightRef}
                        type="number"
                        step="0.5"
                        min="0"
                        value={weightInputValue}
                        onChange={(e) => setWeightInputValue(e.target.value)}
                        placeholder="e.g. 60"
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-600"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveExerciseWeight(ex.name);
                          if (e.key === "Escape") setActiveWeightInput(null);
                        }}
                      />
                      <span className="text-sm text-zinc-500 flex-shrink-0">kg</span>
                      <button onClick={() => saveExerciseWeight(ex.name)} className="bg-white text-black text-sm font-medium px-3 py-2 rounded-lg hover:bg-zinc-200 transition-colors flex-shrink-0">
                        Save
                      </button>
                      <button onClick={() => setActiveWeightInput(null)} className="text-zinc-500 hover:text-zinc-300 text-sm flex-shrink-0 w-7 text-center">
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {isRest && (
          <div className="border-t border-zinc-800 px-4 py-3">
            <p className="text-zinc-500 text-sm">Hit your protein target and stay hydrated.</p>
          </div>
        )}
      </section>

      {/* Core Tips */}
      {isWeightsSession && (
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

      {/* Body weight */}
      <section className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">Morning weight</h3>
            <p className="text-xs text-zinc-600 mt-0.5">After toilet, before food</p>
          </div>
          {log.weight ? (
            <button onClick={() => setShowBodyWeightInput(true)} className="text-lg font-bold text-white hover:text-zinc-300 transition-colors">
              {log.weight} kg
            </button>
          ) : (
            <button onClick={() => setShowBodyWeightInput(true)} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors border border-zinc-700 rounded-lg px-3 py-1.5">
              + Log weight
            </button>
          )}
        </div>
        {showBodyWeightInput && (
          <div className="mt-3 flex gap-2">
            <input
              type="number"
              step="0.1"
              value={bodyWeightInput}
              onChange={(e) => setBodyWeightInput(e.target.value)}
              placeholder="82.0"
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") saveBodyWeight();
                if (e.key === "Escape") setShowBodyWeightInput(false);
              }}
            />
            <span className="flex items-center text-sm text-zinc-500">kg</span>
            <button onClick={saveBodyWeight} className="bg-white text-black text-sm font-medium px-4 py-2 rounded-lg hover:bg-zinc-200 transition-colors">
              Save
            </button>
            <button onClick={() => setShowBodyWeightInput(false)} className="text-zinc-500 hover:text-zinc-300 text-sm px-2">
              ✕
            </button>
          </div>
        )}
      </section>

      {/* Macros */}
      <MacroTracker
        macros={log.macros ?? {}}
        editing={editingMacros}
        inputs={macroInputs}
        onEdit={() => { setMacroInputs(log.macros ?? {}); setEditingMacros(true); }}
        onInputChange={(field, val) =>
          setMacroInputs((prev) => ({ ...prev, [field]: val === "" ? undefined : Number(val) }))
        }
        onSave={saveMacros}
        onCancel={() => setEditingMacros(false)}
      />
    </div>
  );
}

// ─── Macro tracker component ──────────────────────────────────────────────────

const MACRO_META = [
  { key: "calories" as const, label: "Calories", unit: "kcal", color: "text-white", bar: "bg-zinc-400", target: 2000 },
  { key: "protein" as const, label: "Protein", unit: "g", color: "text-blue-400", bar: "bg-blue-500", target: 185 },
  { key: "carbs" as const, label: "Carbs", unit: "g", color: "text-amber-400", bar: "bg-amber-500", target: 175 },
  { key: "fat" as const, label: "Fat", unit: "g", color: "text-rose-400", bar: "bg-rose-500", target: 60 },
];

function MacroTracker({
  macros, editing, inputs, onEdit, onInputChange, onSave, onCancel,
}: {
  macros: MacroLog;
  editing: boolean;
  inputs: MacroLog;
  onEdit: () => void;
  onInputChange: (field: keyof MacroLog, val: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const hasAny = Object.values(macros).some((v) => v != null);

  return (
    <section className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Calories & macros</h3>
          <p className="text-xs text-zinc-600 mt-0.5">Actual vs target</p>
        </div>
        {!editing && (
          <button onClick={onEdit} className="text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-700 rounded-lg px-3 py-1.5 transition-colors">
            {hasAny ? "Edit" : "+ Log"}
          </button>
        )}
      </div>

      {editing ? (
        <div className="border-t border-zinc-800 px-4 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {MACRO_META.map((m) => (
              <div key={m.key}>
                <label className={`text-xs font-medium block mb-1.5 ${m.color}`}>
                  {m.label} <span className="text-zinc-600 font-normal">· target {m.target.toLocaleString()}{m.key !== "calories" ? "g" : ""}</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step={m.key === "calories" ? "10" : "1"}
                  value={inputs[m.key] != null ? String(inputs[m.key]) : ""}
                  onChange={(e) => onInputChange(m.key, e.target.value)}
                  placeholder={String(m.target)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                  onKeyDown={(e) => e.key === "Enter" && onSave()}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onSave} className="flex-1 bg-white text-black text-sm font-medium py-2 rounded-lg hover:bg-zinc-200 transition-colors">Save</button>
            <button onClick={onCancel} className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="border-t border-zinc-800 divide-y divide-zinc-800/60">
          {MACRO_META.map((m) => {
            const actual = macros[m.key];
            const pct = actual != null ? Math.min(actual / m.target, 1.2) : 0;
            const over = actual != null && actual > m.target;
            const diff = actual != null ? actual - m.target : null;

            return (
              <div key={m.key} className="px-4 py-3">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-xs text-zinc-500">{m.label}</span>
                  <div className="flex items-baseline gap-1.5">
                    {actual != null ? (
                      <>
                        <span className={`text-sm font-bold ${m.color}`}>
                          {actual.toLocaleString()}{m.key !== "calories" ? "g" : ""}
                        </span>
                        <span className="text-xs text-zinc-600">/ {m.target.toLocaleString()}{m.key !== "calories" ? "g" : ""}</span>
                        {diff != null && (
                          <span className={`text-xs font-medium ${over ? "text-rose-400" : "text-emerald-400"}`}>
                            {over ? `+${diff}` : diff}{m.key !== "calories" ? "g" : ""}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-zinc-600">target {m.target.toLocaleString()}{m.key !== "calories" ? "g" : ""}</span>
                    )}
                  </div>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${over ? "bg-rose-500" : m.bar}`} style={{ width: `${Math.min(pct * 100, 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
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
