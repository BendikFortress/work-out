"use client";

import { useState, useEffect, useRef } from "react";
import {
  WORKOUT_SESSIONS,
  WORKOUT_BADGE_COLORS,
  MEALS,
  getWorkoutForDay,
  getWeekNumber,
  type WorkoutType,
} from "@/lib/plan-data";

// ─── Types ────────────────────────────────────────────────────────────────────

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEIGHTS_TYPES: WorkoutType[] = ["push", "pull", "legs", "full", "upper", "lower"];
const MACRO_META = [
  { key: "calories" as const, label: "Calories", unit: "kcal", color: "text-white", target: 2000 },
  { key: "protein" as const, label: "Protein", unit: "g", color: "text-blue-400", target: 185 },
  { key: "carbs" as const, label: "Carbs", unit: "g", color: "text-amber-400", target: 175 },
  { key: "fat" as const, label: "Fat", unit: "g", color: "text-rose-400", target: 60 },
];

interface Settings { startDate: string; startWeight: number; targetWeight: number; }

interface ApiLog {
  date: string;
  workoutCompleted: boolean;
  workoutType: string | null;
  bodyWeight: number | null;
  exerciseLogs: Record<string, { completed: boolean; weight?: number }>;
  macros: { calories?: number; protein?: number; carbs?: number; fat?: number };
  mealsChecked: { lunch: boolean; snack: boolean; dinner: boolean; eveningSnack: boolean };
  workoutRating?: number | null;
  feelingScore?: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return `${DAY_SHORT[d.getDay()]} ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

function getDateRange(startDate: string, weeks: number): string[] {
  const dates: string[] = [];
  const start = new Date(startDate + "T12:00:00Z");
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

function isPast(d: string, today: string) { return d < today; }
function isToday(d: string, today: string) { return d === today; }

function getMacroStatus(log?: ApiLog): "none" | "partial" | "full" {
  if (!log?.macros) return "none";
  const n = (["calories", "protein", "carbs", "fat"] as const).filter((k) => log.macros[k] != null).length;
  return n === 0 ? "none" : n < 4 ? "partial" : "full";
}

function getStatus(log: ApiLog | undefined, wt: WorkoutType) {
  const isRest = ["rest", "active", "walk"].includes(wt);
  const meals = log ? (["lunch", "snack", "dinner", "eveningSnack"] as const).filter((k) => log.mealsChecked[k]).length : 0;
  return { workout: isRest ? true : (log?.workoutCompleted ?? false), meals, weight: !!log?.bodyWeight };
}

function emptyLog(dateStr: string, wt: WorkoutType): ApiLog {
  return {
    date: dateStr, workoutCompleted: false, workoutType: wt,
    bodyWeight: null,
    exerciseLogs: {}, macros: {},
    mealsChecked: { lunch: false, snack: false, dinner: false, eveningSnack: false },
    workoutRating: null, feelingScore: null,
  };
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TrackingPage() {
  const [logs, setLogs] = useState<Record<string, ApiLog>>({});
  const [settings, setSettings] = useState<Settings | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [startDateInput, setStartDateInput] = useState("");
  const [startWeightInput, setStartWeightInput] = useState("");
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  // Tracks weeks that have been toggled from their default state.
  // Past/current weeks default to open; future weeks default to closed.
  const [weekToggles, setWeekToggles] = useState<Set<number>>(new Set());

  function toggleWeek(weekIdx: number) {
    setWeekToggles((prev) => {
      const next = new Set(prev);
      if (next.has(weekIdx)) next.delete(weekIdx); else next.add(weekIdx);
      return next;
    });
  }

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const [sRes, lRes] = await Promise.all([fetch("/api/settings"), fetch("/api/logs")]);
    if (!sRes.ok) { console.error("[tracking] settings error:", await sRes.json().catch(() => ({}))); return; }
    const s: Settings = await sRes.json();
    const l: Record<string, ApiLog> = lRes.ok ? await lRes.json() : {};
    setSettings(s);
    setStartDateInput(s.startDate);
    setStartWeightInput(String(s.startWeight));
    setLogs(l);
  }

  async function saveSettingsHandler() {
    const w = parseFloat(startWeightInput);
    const updated: Settings = { startDate: startDateInput, startWeight: isNaN(w) ? 82 : w, targetWeight: settings!.targetWeight };
    setSettings(updated);
    setShowSettings(false);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    await load();
  }

  async function seedSchedule() {
    setSeeding(true);
    await fetch("/api/schedule", { method: "POST" });
    await load();
    setSeeding(false);
  }

  function handleLogUpdate(dateStr: string, partial: Partial<ApiLog>) {
    setLogs((prev) => {
      const current = prev[dateStr] ?? emptyLog(dateStr, "rest");
      const updated = { ...current, ...partial };
      fetch(`/api/logs/${dateStr}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      }).catch(console.error);
      return { ...prev, [dateStr]: updated };
    });
  }

  if (!settings) return <LoadingSkeleton />;

  const today = new Date().toISOString().split("T")[0];
  const allDates = getDateRange(settings.startDate, 9);
  const weeks: string[][] = Array.from({ length: 9 }, (_, i) => allDates.slice(i * 7, i * 7 + 7));

  // Stats
  const sortedPast = allDates.filter((d) => isPast(d, today) || isToday(d, today));
  let streak = 0;
  for (let i = sortedPast.length - 1; i >= 0; i--) {
    const d = new Date(sortedPast[i] + "T12:00:00");
    const wt = (logs[sortedPast[i]]?.workoutType ?? getWorkoutForDay(getWeekNumber(settings.startDate, d), d.getDay())) as WorkoutType;
    if (getStatus(logs[sortedPast[i]], wt).workout) { streak++; } else if (sortedPast[i] !== today) { break; }
  }
  const workoutsDone = sortedPast.filter((d) => {
    const day = new Date(d + "T12:00:00");
    const wt = (logs[d]?.workoutType ?? getWorkoutForDay(getWeekNumber(settings.startDate, day), day.getDay())) as WorkoutType;
    return getStatus(logs[d], wt).workout;
  }).length;
  const weightPoints = allDates.filter((d) => logs[d]?.bodyWeight).map((d) => ({ date: d, weight: logs[d].bodyWeight! }));

  return (
    <div className="max-w-lg mx-auto px-5 pt-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tracking</h1>
          <p className="text-zinc-500 text-sm mt-1">9-week log</p>
        </div>
        <button onClick={() => setShowSettings(!showSettings)} className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors">
          <SettingsIcon />
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 space-y-3">
          <h3 className="font-semibold text-sm">Plan settings</h3>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Start date</label>
            <input type="date" value={startDateInput} onChange={(e) => setStartDateInput(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Start weight (kg)</label>
            <input type="number" step="0.1" value={startWeightInput} onChange={(e) => setStartWeightInput(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
          </div>
          <div className="flex gap-2">
            <button onClick={saveSettingsHandler} className="flex-1 bg-white text-black text-sm font-medium py-2 rounded-lg hover:bg-zinc-200 transition-colors">Save settings</button>
            <button onClick={seedSchedule} disabled={seeding} className="flex-1 border border-zinc-700 text-zinc-400 text-sm py-2 rounded-lg hover:text-white hover:border-zinc-500 transition-colors disabled:opacity-50">
              {seeding ? "Seeding…" : "Re-seed schedule"}
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[{ v: streak, l: "Day streak" }, { v: workoutsDone, l: "Workouts done" }, { v: weightPoints.length, l: "Weigh-ins" }].map((s) => (
          <div key={s.l} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold">{s.v}</p>
            <p className="text-xs text-zinc-500 mt-1">{s.l}</p>
          </div>
        ))}
      </div>

      {/* Weight chart */}
      {weightPoints.length >= 2 && (
        <section>
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Weight progress</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <WeightChart points={weightPoints} startWeight={settings.startWeight} />
          </div>
        </section>
      )}

      {/* Weekly logs */}
      <section className="space-y-3">
        {weeks.map((weekDates, weekIdx) => {
          const weekNum = weekIdx + 1;
          const hasPast = weekDates.some((d) => isPast(d, today) || isToday(d, today));
          // Past/current weeks are open by default; future weeks are closed by default.
          const isOpen = hasPast ? !weekToggles.has(weekIdx) : weekToggles.has(weekIdx);

          const workoutsDone = weekDates.filter((d) => {
            const dObj = new Date(d + "T12:00:00");
            const wt = ((logs[d]?.workoutType) || getWorkoutForDay(getWeekNumber(settings.startDate, dObj), dObj.getDay())) as WorkoutType;
            return getStatus(logs[d], wt).workout;
          }).length;

          return (
            <div key={weekIdx}>
              {/* Week header — always visible, toggles the week open/closed */}
              <button
                onClick={() => toggleWeek(weekIdx)}
                className="w-full flex items-center justify-between px-1 mb-2 group"
              >
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider group-hover:text-zinc-400 transition-colors">
                    Week {weekNum}
                  </h2>
                  {!hasPast && (
                    <span className="text-[10px] text-zinc-600">upcoming</span>
                  )}
                  {hasPast && !isOpen && (
                    <span className="text-[10px] text-zinc-600">{workoutsDone}/7 workouts done</span>
                  )}
                </div>
                <ChevronIcon open={isOpen} />
              </button>

              {isOpen ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800/60">
                  {weekDates.map((dateStr) => {
                    const d = new Date(dateStr + "T12:00:00");
                    const log = logs[dateStr];
                    const wt = ((log?.workoutType) || getWorkoutForDay(getWeekNumber(settings.startDate, d), d.getDay())) as WorkoutType;
                    const status = getStatus(log, wt);
                    const past = isPast(dateStr, today);
                    const todayFlag = isToday(dateStr, today);
                    const future = !past && !todayFlag;
                    const isRestType = ["rest", "active", "walk"].includes(wt);
                    const isExpanded = expandedDate === dateStr;

                    return (
                      <div key={dateStr}>
                        {/* Summary row */}
                        <button
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${todayFlag ? "bg-zinc-800/40" : ""} ${!future ? "hover:bg-zinc-800/30" : "cursor-default"}`}
                          onClick={() => !future && setExpandedDate(isExpanded ? null : dateStr)}
                          disabled={future}
                        >
                          {/* Date */}
                          <div className="w-16 shrink-0">
                            <p className={`text-sm font-medium ${todayFlag ? "text-white" : future ? "text-zinc-600" : "text-zinc-300"}`}>
                              {fmtDate(dateStr)}
                              {todayFlag && <span className="text-[10px] text-blue-400 font-normal block">today</span>}
                            </p>
                          </div>

                          {/* Workout badge + quick stats */}
                          <div className="flex-1 min-w-0">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${future ? "opacity-40" : ""} ${WORKOUT_BADGE_COLORS[wt]}`}>
                              {wt.toUpperCase()}
                            </span>
                            {log?.bodyWeight && <span className="text-xs text-zinc-500 ml-2">{log.bodyWeight} kg</span>}
                            {log?.macros?.calories != null && <span className="text-xs text-zinc-600 ml-2">{log.macros.calories} kcal</span>}
                            {log?.workoutRating != null && <span className="text-xs text-zinc-600 ml-2">W:{log.workoutRating}★</span>}
                            {log?.feelingScore != null && <span className="text-xs text-zinc-600 ml-1">F:{log.feelingScore}★</span>}
                          </div>

                          {/* Status dots */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {!isRestType && <StatusDot done={status.workout} missing={past && !status.workout} future={future} label="W" />}
                            <StatusDot done={status.meals >= 3} missing={past && status.meals < 3} partial={status.meals > 0 && status.meals < 3} future={future} label="M" />
                            {(() => { const ms = getMacroStatus(log); return <StatusDot done={ms === "full"} missing={past && ms === "none"} partial={ms === "partial"} future={future} label="C" />; })()}
                            <StatusDot done={status.weight} missing={past && !status.weight} future={future} label="⚖" />
                            {!future && <ChevronIcon open={isExpanded} />}
                          </div>
                        </button>

                        {/* Expanded edit panel */}
                        {isExpanded && (
                          <DayEditPanel
                            workoutType={wt}
                            log={log ?? emptyLog(dateStr, wt)}
                            onUpdate={(partial) => handleLogUpdate(dateStr, partial)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Collapsed — show a mini row of workout type pills for the week */
                <div className={`rounded-2xl border px-4 py-2.5 flex items-center gap-1.5 flex-wrap ${hasPast ? "bg-zinc-900/50 border-zinc-800/50" : "bg-zinc-900/30 border-zinc-800/30"}`}>
                  {weekDates.map((d) => {
                    const dObj = new Date(d + "T12:00:00");
                    const wt = ((logs[d]?.workoutType) || getWorkoutForDay(getWeekNumber(settings.startDate, dObj), dObj.getDay())) as WorkoutType;
                    return (
                      <span key={d} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${hasPast ? "opacity-60" : "opacity-35"} ${WORKOUT_BADGE_COLORS[wt]}`}>
                        {wt.toUpperCase()}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Legend */}
      <section className="pb-4">
        <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />Done</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />Partial</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />Missed</span>
          <span>W = workout · M = meals · C = calories · ⚖ = weight</span>
        </div>
      </section>
    </div>
  );
}

// ─── Day edit panel ───────────────────────────────────────────────────────────

function DayEditPanel({ workoutType, log, onUpdate }: {
  workoutType: WorkoutType;
  log: ApiLog;
  onUpdate: (partial: Partial<ApiLog>) => void;
}) {
  const workout = WORKOUT_SESSIONS[workoutType];
  const isWeights = WEIGHTS_TYPES.includes(workoutType);
  const isRest = ["rest"].includes(workoutType);
  const exerciseLogs = log.exerciseLogs ?? {};
  const mealsChecked = log.mealsChecked ?? { lunch: false, snack: false, dinner: false, eveningSnack: false };

  // Body weight
  const [editingBW, setEditingBW] = useState(false);
  const [bwInput, setBwInput] = useState(log.bodyWeight != null ? String(log.bodyWeight) : "");

  // Exercise weight
  const [activeExInput, setActiveExInput] = useState<string | null>(null);
  const [exWeightVal, setExWeightVal] = useState("");
  const exWeightRef = useRef<HTMLInputElement>(null);

  // Macros
  const [editingMacros, setEditingMacros] = useState(false);
  const [macroInputs, setMacroInputs] = useState({ ...log.macros });

  useEffect(() => { if (activeExInput && exWeightRef.current) exWeightRef.current.focus(); }, [activeExInput]);

  function toggleExercise(name: string) {
    const cur = exerciseLogs[name] ?? { completed: false };
    const updated = { ...exerciseLogs, [name]: { ...cur, completed: !cur.completed } };
    const allDone = workout.exercises?.every((ex) => updated[ex.name]?.completed) ?? false;
    onUpdate({ exerciseLogs: updated, workoutCompleted: allDone || log.workoutCompleted });
  }

  function openExWeight(name: string) {
    setExWeightVal(exerciseLogs[name]?.weight != null ? String(exerciseLogs[name].weight) : "");
    setActiveExInput(name);
  }

  function saveExWeight(name: string) {
    const w = parseFloat(exWeightVal);
    const cur = exerciseLogs[name] ?? { completed: false };
    onUpdate({ exerciseLogs: { ...exerciseLogs, [name]: { ...cur, weight: isNaN(w) ? undefined : w } } });
    setActiveExInput(null);
  }

  function saveBW() {
    const w = parseFloat(bwInput);
    if (!isNaN(w)) onUpdate({ bodyWeight: w });
    setEditingBW(false);
  }

  function saveMacros() {
    onUpdate({ macros: {
      calories: macroInputs.calories != null && !isNaN(Number(macroInputs.calories)) ? Number(macroInputs.calories) : undefined,
      protein: macroInputs.protein != null && !isNaN(Number(macroInputs.protein)) ? Number(macroInputs.protein) : undefined,
      carbs: macroInputs.carbs != null && !isNaN(Number(macroInputs.carbs)) ? Number(macroInputs.carbs) : undefined,
      fat: macroInputs.fat != null && !isNaN(Number(macroInputs.fat)) ? Number(macroInputs.fat) : undefined,
    }});
    setEditingMacros(false);
  }

  const mealKeys = ["lunch", "snack", "dinner", "eveningSnack"] as const;
  const mealLabels = ["Lunch", "Pre-workout snack", "Dinner", "Evening snack"];

  return (
    <div className="border-t border-zinc-800 bg-zinc-900/50 divide-y divide-zinc-800/60">

      {/* Workout section */}
      {!isRest && (
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Workout</p>
            <button
              onClick={() => onUpdate({ workoutCompleted: !log.workoutCompleted })}
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-all ${log.workoutCompleted ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "bg-zinc-800 text-zinc-500 border border-zinc-700 hover:border-zinc-500"}`}
            >
              <CheckIconSm done={log.workoutCompleted} /> {log.workoutCompleted ? "Done" : "Mark done"}
            </button>
          </div>
          {workout.exercises && (
            <div className="space-y-0 -mx-4">
              {workout.exercises.map((ex, i) => {
                const exLog = exerciseLogs[ex.name] ?? { completed: false };
                const inputOpen = activeExInput === ex.name;
                return (
                  <div key={ex.name} className={`${i > 0 ? "border-t border-zinc-800/40" : ""}`}>
                    <div className="flex items-center gap-3 px-4 py-2.5">
                      <button
                        onClick={() => toggleExercise(ex.name)}
                        className={`shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-all ${exLog.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-zinc-600 hover:border-zinc-400"}`}
                      >
                        {exLog.completed && <MiniCheckIcon />}
                      </button>
                      <span className={`flex-1 text-sm ${exLog.completed ? "text-zinc-600 line-through" : "text-zinc-300"}`}>{ex.name}</span>
                      {isWeights && (
                        <button
                          onClick={() => openExWeight(ex.name)}
                          className={`shrink-0 text-xs px-2 py-0.5 rounded-md transition-colors ${exLog.weight != null ? "bg-blue-900/40 text-blue-300 border border-blue-700/50" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"}`}
                        >
                          {exLog.weight != null ? `${exLog.weight} kg` : "+ kg"}
                        </button>
                      )}
                      <span className="shrink-0 text-xs text-zinc-600 font-mono ml-1">{ex.sets}</span>
                    </div>
                    {inputOpen && (
                      <div className="px-4 pb-2.5 flex gap-2">
                        <input ref={exWeightRef} type="number" step="0.5" value={exWeightVal} onChange={(e) => setExWeightVal(e.target.value)}
                          placeholder="kg" className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-600"
                          onKeyDown={(e) => { if (e.key === "Enter") saveExWeight(ex.name); if (e.key === "Escape") setActiveExInput(null); }} />
                        <button onClick={() => saveExWeight(ex.name)} className="bg-white text-black text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-zinc-200">Save</button>
                        <button onClick={() => setActiveExInput(null)} className="text-zinc-500 text-sm w-6 text-center">✕</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {workout.notes && <p className="text-xs text-zinc-600 mt-2">{workout.notes}</p>}
        </div>
      )}

      {/* Body weight */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Morning weight</p>
          {log.bodyWeight != null && !editingBW ? (
            <button onClick={() => setEditingBW(true)} className="text-sm font-bold text-white hover:text-zinc-300">{log.bodyWeight} kg</button>
          ) : !editingBW ? (
            <button onClick={() => setEditingBW(true)} className="text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-700 rounded-lg px-2.5 py-1">+ Log</button>
          ) : null}
        </div>
        {editingBW && (
          <div className="mt-2 flex gap-2">
            <input type="number" step="0.1" value={bwInput} onChange={(e) => setBwInput(e.target.value)} placeholder="82.0" autoFocus
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
              onKeyDown={(e) => { if (e.key === "Enter") saveBW(); if (e.key === "Escape") setEditingBW(false); }} />
            <span className="flex items-center text-xs text-zinc-500">kg</span>
            <button onClick={saveBW} className="bg-white text-black text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-zinc-200">Save</button>
            <button onClick={() => setEditingBW(false)} className="text-zinc-500 text-sm w-6 text-center">✕</button>
          </div>
        )}
      </div>

      {/* Meals */}
      <div className="px-4 py-3">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2.5">Meals</p>
        <div className="space-y-2">
          {mealKeys.map((key, i) => {
            const checked = mealsChecked[key];
            return (
              <button key={key} onClick={() => onUpdate({ mealsChecked: { ...mealsChecked, [key]: !checked } })}
                className="w-full flex items-center gap-2.5 text-left">
                <div className={`w-4 h-4 rounded-full shrink-0 flex items-center justify-center border transition-all ${checked ? "bg-emerald-500 border-emerald-500 text-white" : "border-zinc-600 hover:border-zinc-400"}`}>
                  {checked && <MiniCheckIcon />}
                </div>
                <span className={`text-sm ${checked ? "text-zinc-600 line-through" : "text-zinc-300"}`}>
                  {mealLabels[i]}
                  <span className="text-zinc-600 text-xs font-normal ml-1">· {MEALS[i].time}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Macros */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Calories & macros</p>
          {!editingMacros && (
            <button onClick={() => { setMacroInputs({ ...log.macros }); setEditingMacros(true); }}
              className="text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-700 rounded-lg px-2.5 py-1 transition-colors">
              {Object.values(log.macros).some((v) => v != null) ? "Edit" : "+ Log"}
            </button>
          )}
        </div>
        {editingMacros ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {MACRO_META.map((m) => (
                <div key={m.key}>
                  <label className={`text-[10px] font-medium block mb-1 ${m.color}`}>{m.label} <span className="text-zinc-600">· {m.target}{m.key !== "calories" ? "g" : ""}</span></label>
                  <input type="number" step={m.key === "calories" ? "10" : "1"} value={macroInputs[m.key] != null ? String(macroInputs[m.key]) : ""}
                    onChange={(e) => setMacroInputs((p) => ({ ...p, [m.key]: e.target.value === "" ? undefined : Number(e.target.value) }))}
                    placeholder={String(m.target)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500" />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={saveMacros} className="flex-1 bg-white text-black text-xs font-medium py-1.5 rounded-lg hover:bg-zinc-200">Save</button>
              <button onClick={() => setEditingMacros(false)} className="px-3 text-zinc-500 hover:text-zinc-300 text-xs">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {MACRO_META.map((m) => {
              const v = log.macros[m.key];
              return (
                <div key={m.key} className="bg-zinc-800/60 rounded-xl p-2 text-center">
                  <p className={`text-sm font-bold ${v != null ? m.color : "text-zinc-700"}`}>
                    {v != null ? `${v}${m.key !== "calories" ? "g" : ""}` : "—"}
                  </p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{m.label}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ratings */}
      <div className="px-4 py-3 space-y-4">
        {!isRest && (
          <RatingPicker
            label="Workout rating"
            labels={["Terrible", "Bad", "OK", "Good", "Amazing"]}
            value={log.workoutRating ?? null}
            onChange={(n) => onUpdate({ workoutRating: n === log.workoutRating ? null : n })}
          />
        )}
        <RatingPicker
          label="How did you feel?"
          labels={["Rough", "Low", "Okay", "Good", "Great"]}
          value={log.feelingScore ?? null}
          onChange={(n) => onUpdate({ feelingScore: n === log.feelingScore ? null : n })}
        />
      </div>
    </div>
  );
}

// ─── Small components ─────────────────────────────────────────────────────────

// ─── Rating picker ────────────────────────────────────────────────────────────

const RATING_COLORS: Record<number, string> = {
  1: "bg-rose-500/25 text-rose-300 border border-rose-500/50",
  2: "bg-orange-500/25 text-orange-300 border border-orange-500/50",
  3: "bg-amber-500/25 text-amber-300 border border-amber-500/50",
  4: "bg-lime-500/25 text-lime-300 border border-lime-500/50",
  5: "bg-emerald-500/25 text-emerald-300 border border-emerald-500/50",
};

function RatingPicker({ label, labels, value, onChange }: {
  label: string;
  labels: string[];
  value: number | null;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      {label && <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">{label}</p>}
      <div className="grid grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`flex flex-col items-center gap-0.5 py-2 rounded-xl text-sm font-bold transition-all ${
              value === n ? RATING_COLORS[n] : "bg-zinc-800 text-zinc-600 hover:bg-zinc-700 hover:text-zinc-400"
            }`}
          >
            <span>{n}</span>
            <span className="text-[9px] font-normal text-current opacity-70 leading-tight">{labels[n - 1]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function StatusDot({ done, missing, future, label, partial }: { done: boolean; missing: boolean; future: boolean; label: string; partial?: boolean; }) {
  const color = future ? "bg-zinc-800 text-zinc-600"
    : done ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
    : partial ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
    : missing ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
    : "bg-zinc-800 text-zinc-600";
  return <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ${color}`}>{label}</div>;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className={`shrink-0 text-zinc-600 transition-transform ${open ? "rotate-180" : ""}`}>
      <polyline points="4 6 8 10 12 6" />
    </svg>
  );
}

function CheckIconSm({ done }: { done: boolean }) {
  if (!done) return null;
  return <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 8 6.5 11.5 13 5" /></svg>;
}

function MiniCheckIcon() {
  return <svg width="8" height="8" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 8 6.5 11.5 13 5" /></svg>;
}

function WeightChart({ points, startWeight }: { points: { date: string; weight: number }[]; startWeight: number }) {
  const weights = points.map((p) => p.weight);
  const min = Math.min(...weights) - 0.5;
  const max = Math.max(...weights, startWeight) + 0.5;
  const range = max - min;
  const W = 300; const H = 80;
  const toX = (i: number) => (i / (points.length - 1)) * W;
  const toY = (w: number) => H - ((w - min) / range) * H;
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(p.weight).toFixed(1)}`).join(" ");
  const latest = weights[weights.length - 1];
  const change = latest - startWeight;
  return (
    <div>
      <div className="flex justify-between items-baseline mb-3">
        <span className="text-2xl font-bold">{latest} kg</span>
        <span className={`text-sm font-medium ${change < 0 ? "text-emerald-400" : "text-rose-400"}`}>{change < 0 ? "" : "+"}{change.toFixed(1)} kg</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16">
        <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => <circle key={i} cx={toX(i)} cy={toY(p.weight)} r="3" fill="#3b82f6" />)}
      </svg>
    </div>
  );
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-lg mx-auto px-5 pt-6 space-y-5 animate-pulse">
      <div className="h-10 bg-zinc-900 rounded-xl w-48" />
      <div className="grid grid-cols-3 gap-2">{[0, 1, 2].map((i) => <div key={i} className="h-20 bg-zinc-900 rounded-2xl" />)}</div>
      <div className="h-64 bg-zinc-900 rounded-2xl" />
    </div>
  );
}
