"use client";

import { useState } from "react";
import {
  PHASES,
  WORKOUT_SESSIONS,
  WORKOUT_BADGE_COLORS,
  WORKOUT_COLORS,
  DAY_KEYS,
  DAY_LABELS,
  MILESTONES,
  STALL_TIPS,
  SUPPLEMENTS,
  type WorkoutType,
  type DaySchedule,
} from "@/lib/plan-data";

export default function OverviewPage() {
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);
  const [expandedWorkout, setExpandedWorkout] = useState<WorkoutType | null>(null);

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">9-Week Shred & Define</h1>
        <p className="text-zinc-500 text-sm mt-1">Full program overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Start weight", value: "82 kg" },
          { label: "Target weight", value: "76–78 kg" },
          { label: "Target fat loss", value: "4–6 kg" },
          { label: "Weekly deficit", value: "~500 kcal/day" },
        ].map((s) => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="text-zinc-500 text-xs mb-1">{s.label}</p>
            <p className="text-xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Phase structure */}
      <section>
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Phase structure</h2>
        <div className="space-y-3">
          {PHASES.map((phase, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <button
                className="w-full text-left px-4 py-4"
                onClick={() => setExpandedPhase(expandedPhase === i ? null : i)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">
                        Weeks {phase.weeks}
                      </span>
                    </div>
                    <h3 className="font-semibold">{phase.label}</h3>
                    <p className="text-zinc-500 text-sm mt-1 leading-snug">{phase.description}</p>
                  </div>
                  <ChevronIcon open={expandedPhase === i} />
                </div>
              </button>

              {expandedPhase === i && (
                <div className="border-t border-zinc-800 px-4 pb-4 pt-3">
                  <div className="grid grid-cols-7 gap-1.5">
                    {DAY_KEYS.map((day) => {
                      const wt = phase.schedule[day as keyof DaySchedule] as WorkoutType;
                      return (
                        <div key={day} className="text-center">
                          <p className="text-[10px] text-zinc-600 mb-1">{DAY_LABELS[day as keyof DaySchedule]}</p>
                          <div className={`text-[9px] font-bold py-1.5 px-0.5 rounded-lg ${WORKOUT_COLORS[wt]}`}>
                            {wt === "cardio" ? "LISS" : wt === "active" ? "REST" : wt.toUpperCase()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Legend */}
      <section>
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Legend</h2>
        <div className="flex flex-wrap gap-2">
          {(["push", "hiit", "cardio", "active"] as WorkoutType[]).map((type) => (
            <span key={type} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${WORKOUT_BADGE_COLORS[type]}`}>
              {type === "cardio" ? "Steady cardio" : type === "active" ? "Active recovery" : type.charAt(0).toUpperCase() + type.slice(1)}
            </span>
          ))}
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${WORKOUT_BADGE_COLORS["legs"]}`}>
            Weights
          </span>
        </div>
      </section>

      {/* Workout library */}
      <section>
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Workout library</h2>
        <div className="space-y-2">
          {(["push", "pull", "legs", "full", "upper", "lower", "hiit", "cardio"] as WorkoutType[]).map((type) => {
            const w = WORKOUT_SESSIONS[type];
            const open = expandedWorkout === type;
            return (
              <div key={type} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <button
                  className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-3"
                  onClick={() => setExpandedWorkout(open ? null : type)}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${WORKOUT_COLORS[type]}`}>
                      {type.toUpperCase()}
                    </span>
                    <span className="font-medium text-sm">{w.label}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-zinc-600">{w.duration} min</span>
                    <ChevronIcon open={open} />
                  </div>
                </button>
                {open && w.exercises && (
                  <div className="border-t border-zinc-800">
                    {w.exercises.map((ex, i) => (
                      <div
                        key={i}
                        className={`flex justify-between items-center px-4 py-2.5 ${
                          i !== w.exercises!.length - 1 ? "border-b border-zinc-800/60" : ""
                        }`}
                      >
                        <span className="text-sm text-zinc-200">{ex.name}</span>
                        <span className="text-sm text-zinc-500 font-mono ml-4 flex-shrink-0">{ex.sets}</span>
                      </div>
                    ))}
                    {w.notes && (
                      <p className="px-4 py-3 text-sm text-zinc-500 border-t border-zinc-800">{w.notes}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Milestones */}
      <section>
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Expected milestones</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800">
          {MILESTONES.map((m) => (
            <div key={m.week} className="flex items-center justify-between px-4 py-4">
              <div>
                <p className="font-semibold">Week {m.week}</p>
                <p className="text-zinc-500 text-sm mt-0.5">{m.note}</p>
              </div>
              <p className="text-lg font-bold text-zinc-300">{m.weight}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stall tips */}
      <section>
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Adjust if things stall</h2>
        <div className="space-y-2">
          {STALL_TIPS.map((t, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
              <p className="text-sm font-medium text-zinc-300">{t.trigger}</p>
              <p className="text-sm text-zinc-500 mt-0.5">{t.action}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Supplements */}
      <section>
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Supplements worth considering</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800">
          {SUPPLEMENTS.map((s, i) => (
            <div key={i} className="flex gap-2 px-4 py-3">
              <span className="text-zinc-600 mt-0.5 flex-shrink-0">→</span>
              <div>
                <span className="text-sm font-medium text-zinc-200">{s.name}</span>
                <span className="text-sm text-zinc-500"> — {s.note}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`flex-shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <polyline points="4 6 8 10 12 6" />
    </svg>
  );
}
