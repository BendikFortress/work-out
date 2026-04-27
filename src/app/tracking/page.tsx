"use client";

import { useState, useEffect } from "react";
import {
  getWorkoutForDay,
  getWeekNumber,
  WORKOUT_BADGE_COLORS,
  type WorkoutType,
} from "@/lib/plan-data";

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface Settings {
  startDate: string;
  startWeight: number;
  targetWeight: number;
}

interface ApiLog {
  date: string;
  workoutCompleted: boolean;
  workoutType: string | null;
  bodyWeight: number | null;
  exerciseLogs: Record<string, { completed: boolean; weight?: number }>;
  macros: { calories?: number; protein?: number; carbs?: number; fat?: number };
  mealsChecked: { lunch: boolean; snack: boolean; dinner: boolean; eveningSnack: boolean };
}

function formatDisplayDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return `${DAY_SHORT[d.getDay()]} ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

function getDateRange(startDate: string, weeks: number): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

function isPast(d: string, today: string) { return d < today; }
function isToday(d: string, today: string) { return d === today; }

function getMacroStatus(log: ApiLog | undefined): "none" | "partial" | "full" {
  if (!log?.macros) return "none";
  const keys: (keyof ApiLog["macros"])[] = ["calories", "protein", "carbs", "fat"];
  const logged = keys.filter((k) => log.macros[k] != null).length;
  if (logged === 0) return "none";
  if (logged < 4) return "partial";
  return "full";
}

function getCompletionStatus(log: ApiLog | undefined, workoutType: WorkoutType) {
  const isRestOrActive = ["rest", "active", "walk"].includes(workoutType);
  const mealsChecked = log
    ? ["lunch", "snack", "dinner", "eveningSnack"].filter((k) => (log.mealsChecked as Record<string, boolean>)[k]).length
    : 0;
  return {
    workout: isRestOrActive ? true : (log?.workoutCompleted ?? false),
    meals: mealsChecked,
    weight: !!(log?.bodyWeight),
  };
}

export default function TrackingPage() {
  const [logs, setLogs] = useState<Record<string, ApiLog>>({});
  const [settings, setSettings] = useState<Settings | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [startDateInput, setStartDateInput] = useState("");
  const [startWeightInput, setStartWeightInput] = useState("");

  useEffect(() => {
    async function load() {
      const [sRes, lRes] = await Promise.all([fetch("/api/settings"), fetch("/api/logs")]);
      const s: Settings = await sRes.json();
      const l: Record<string, ApiLog> = await lRes.json();
      setSettings(s);
      setStartDateInput(s.startDate);
      setStartWeightInput(String(s.startWeight));
      setLogs(l);
    }
    load();
  }, []);

  if (!settings) return <LoadingSkeleton />;

  const today = new Date().toISOString().split("T")[0];
  const allDates = getDateRange(settings.startDate, 9);

  const weeks: string[][] = [];
  for (let i = 0; i < 9; i++) weeks.push(allDates.slice(i * 7, i * 7 + 7));

  async function saveSettingsHandler() {
    const w = parseFloat(startWeightInput);
    const updated: Settings = {
      startDate: startDateInput,
      startWeight: isNaN(w) ? 82 : w,
      targetWeight: settings!.targetWeight,
    };
    setSettings(updated);
    setShowSettings(false);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    // Reload logs in case date range changed
    const lRes = await fetch("/api/logs");
    setLogs(await lRes.json());
  }

  // Streak
  const sortedPastDates = allDates.filter((d) => isPast(d, today) || isToday(d, today));
  let streak = 0;
  for (let i = sortedPastDates.length - 1; i >= 0; i--) {
    const d = new Date(sortedPastDates[i] + "T12:00:00");
    const wt = getWorkoutForDay(getWeekNumber(settings.startDate, d), d.getDay()) as WorkoutType;
    const status = getCompletionStatus(logs[sortedPastDates[i]], wt);
    if (status.workout) { streak++; } else if (sortedPastDates[i] !== today) { break; }
  }

  const workoutsDone = sortedPastDates.filter((d) => {
    const day = new Date(d + "T12:00:00");
    const wt = getWorkoutForDay(getWeekNumber(settings.startDate, day), day.getDay()) as WorkoutType;
    return getCompletionStatus(logs[d], wt).workout;
  }).length;

  const weightPoints = allDates
    .filter((d) => logs[d]?.bodyWeight)
    .map((d) => ({ date: d, weight: logs[d].bodyWeight! }));

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tracking</h1>
          <p className="text-zinc-500 text-sm mt-1">9-week log</p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          <SettingsIcon />
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 space-y-3">
          <h3 className="font-semibold text-sm">Plan settings</h3>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Start date</label>
            <input
              type="date"
              value={startDateInput}
              onChange={(e) => setStartDateInput(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Start weight (kg)</label>
            <input
              type="number"
              step="0.1"
              value={startWeightInput}
              onChange={(e) => setStartWeightInput(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
            />
          </div>
          <button
            onClick={saveSettingsHandler}
            className="w-full bg-white text-black text-sm font-medium py-2 rounded-lg hover:bg-zinc-200 transition-colors"
          >
            Save settings
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold">{streak}</p>
          <p className="text-xs text-zinc-500 mt-1">Day streak</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold">{workoutsDone}</p>
          <p className="text-xs text-zinc-500 mt-1">Workouts done</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold">{weightPoints.length}</p>
          <p className="text-xs text-zinc-500 mt-1">Weigh-ins</p>
        </div>
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
      <section className="space-y-4">
        {weeks.map((weekDates, weekIdx) => {
          const weekNum = weekIdx + 1;
          const pastDates = weekDates.filter((d) => isPast(d, today) || isToday(d, today));
          if (pastDates.length === 0 && weekIdx > 0) {
            return (
              <div key={weekIdx} className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl px-4 py-3">
                <p className="text-sm text-zinc-600 font-medium">Week {weekNum} — upcoming</p>
              </div>
            );
          }

          return (
            <div key={weekIdx}>
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Week {weekNum}</h2>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800/60">
                {weekDates.map((dateStr) => {
                  const d = new Date(dateStr + "T12:00:00");
                  const wt = getWorkoutForDay(getWeekNumber(settings.startDate, d), d.getDay()) as WorkoutType;
                  const log = logs[dateStr];
                  const status = getCompletionStatus(log, wt);
                  const past = isPast(dateStr, today);
                  const todayFlag = isToday(dateStr, today);
                  const future = !past && !todayFlag;
                  const isRestType = ["rest", "active", "walk"].includes(wt);

                  return (
                    <div key={dateStr} className={`flex items-center gap-3 px-4 py-3 ${todayFlag ? "bg-zinc-800/40" : ""}`}>
                      {/* Date */}
                      <div className="w-16 flex-shrink-0">
                        <p className={`text-sm font-medium ${todayFlag ? "text-white" : future ? "text-zinc-600" : "text-zinc-300"}`}>
                          {formatDisplayDate(dateStr)}
                          {todayFlag && <span className="text-[10px] text-blue-400 font-normal block">today</span>}
                        </p>
                      </div>

                      {/* Workout badge + inline data */}
                      <div className="flex-1 min-w-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${future ? "opacity-40" : ""} ${WORKOUT_BADGE_COLORS[wt]}`}>
                          {wt.toUpperCase()}
                        </span>
                        {log?.bodyWeight && (
                          <span className="text-xs text-zinc-500 ml-2">{log.bodyWeight} kg</span>
                        )}
                        {log?.macros?.calories != null && (
                          <span className="text-xs text-zinc-600 ml-2">{log.macros.calories} kcal</span>
                        )}
                      </div>

                      {/* Status dots */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {!isRestType && (
                          <StatusDot done={status.workout} missing={past && !status.workout} future={future} label="W" />
                        )}
                        <StatusDot done={status.meals >= 3} missing={past && status.meals < 3} future={future} label="M" partial={status.meals > 0 && status.meals < 3} />
                        {(() => {
                          const ms = getMacroStatus(log);
                          return <StatusDot done={ms === "full"} missing={past && ms === "none"} partial={ms === "partial"} future={future} label="C" />;
                        })()}
                        <StatusDot done={status.weight} missing={past && !status.weight} future={future} label="⚖" />
                      </div>
                    </div>
                  );
                })}
              </div>
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
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-zinc-700 inline-block" />Upcoming</span>
          <span>W = workout · M = meals · C = calories · ⚖ = weight</span>
        </div>
      </section>
    </div>
  );
}

function StatusDot({ done, missing, future, label, partial }: {
  done: boolean; missing: boolean; future: boolean; label: string; partial?: boolean;
}) {
  const color = future
    ? "bg-zinc-800 text-zinc-600"
    : done ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
    : partial ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
    : missing ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
    : "bg-zinc-800 text-zinc-600";

  return (
    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ${color}`}>
      {label}
    </div>
  );
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
        <span className={`text-sm font-medium ${change < 0 ? "text-emerald-400" : "text-rose-400"}`}>
          {change < 0 ? "" : "+"}{change.toFixed(1)} kg
        </span>
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
    <div className="max-w-lg mx-auto px-4 pt-6 space-y-5 animate-pulse">
      <div className="h-10 bg-zinc-900 rounded-xl w-48" />
      <div className="grid grid-cols-3 gap-2">
        <div className="h-20 bg-zinc-900 rounded-2xl" />
        <div className="h-20 bg-zinc-900 rounded-2xl" />
        <div className="h-20 bg-zinc-900 rounded-2xl" />
      </div>
      <div className="h-64 bg-zinc-900 rounded-2xl" />
    </div>
  );
}
