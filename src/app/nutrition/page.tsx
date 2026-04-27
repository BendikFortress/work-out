"use client";

import { NUTRITION, MEALS, CORE_TIPS } from "@/lib/plan-data";

const LUNCH_TIPS = [
  "Choose wholegrain, rye, or sourdough bread — slower digesting, keeps you fuller longer",
  "Best coldcuts for protein: turkey breast, chicken breast, roast beef — lowest fat per gram of protein",
  "Avoid processed deli meats with fillers (bologna, mortadella) more than 1–2× per week — high sodium",
  "Pile on mustard, pickles, and vinegar-based condiments freely — virtually zero calories",
  "On low-carb days (weeks 7–9): drop to 2 slices bread and add an extra meat portion",
];

const CARB_CYCLING = [
  { label: "High carb (lift days)", detail: "keep lunch as-is, larger carb portion at dinner" },
  { label: "Low carb (HIIT/cardio days)", detail: "reduce bread to 2 slices, skip the carb at dinner — protein and veg only" },
  { label: "Protein stays at 185g+", detail: "every day no matter what" },
];

export default function NutritionPage() {
  return (
    <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Nutrition</h1>
        <p className="text-zinc-500 text-sm mt-1">Daily targets and meal structure</p>
      </div>

      {/* Macro targets */}
      <section>
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Daily calorie and macro targets</h2>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Calories", value: String(NUTRITION.calories.toLocaleString()), unit: "kcal", color: "text-white" },
            { label: "Protein", value: `${NUTRITION.protein}g`, unit: "", color: "text-blue-400" },
            { label: "Carbs", value: `${NUTRITION.carbs}g`, unit: "", color: "text-amber-400" },
            { label: "Fat", value: `${NUTRITION.fat}g`, unit: "", color: "text-rose-400" },
          ].map((m) => (
            <div key={m.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
              <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
              <p className="text-xs text-zinc-500 mt-1">{m.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Meal structure */}
      <section>
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Meal structure (sample day)</h2>
        <div className="space-y-3">
          {MEALS.map((meal, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 flex items-baseline justify-between border-b border-zinc-800">
                <div>
                  <span className="font-semibold">{meal.label}</span>
                  {meal.optional && <span className="text-zinc-600 text-sm font-normal"> (optional)</span>}
                  <span className="text-zinc-500 text-sm"> — {meal.time}</span>
                </div>
                <span className="text-zinc-500 text-sm shrink-0">~{meal.calories} kcal</span>
              </div>
              <div className="divide-y divide-zinc-800/60">
                {meal.items.map((item, j) => (
                  <div key={j} className="flex justify-between items-center px-4 py-2.5">
                    <span className="text-sm text-zinc-200">{item.name}</span>
                    <span className="text-sm text-zinc-500 ml-4 shrink-0">{item.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-zinc-600 text-sm mt-3 leading-relaxed">
          Since breakfast is removed, dinner carries more of the daily calorie load — make sure it&apos;s a proper sit-down meal with all three components (protein, carbs, veg). Don&apos;t skip the evening snack if you trained that day.
        </p>
      </section>

      {/* Lunch tips */}
      <section>
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Lunch tips — bread and coldcuts</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800/60">
          {LUNCH_TIPS.map((tip, i) => (
            <div key={i} className="flex gap-2 px-4 py-3">
              <span className="text-zinc-600 mt-0.5 shrink-0">→</span>
              <span className="text-sm text-zinc-300">{tip}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Carb cycling */}
      <section>
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Weeks 7–9 carb cycling adjustment</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800/60">
          {CARB_CYCLING.map((item, i) => (
            <div key={i} className="flex gap-2 px-4 py-3">
              <span className="text-zinc-600 mt-0.5 shrink-0">→</span>
              <p className="text-sm text-zinc-300">
                <span className="font-medium">{item.label}</span>
                {": "}
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Core / waist focus */}
      <section>
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Core focus — waist and stomach</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800/60">
          {CORE_TIPS.map((tip, i) => (
            <div key={i} className="flex gap-2 px-4 py-3">
              <span className="text-zinc-600 mt-0.5 shrink-0">→</span>
              <span className="text-sm text-zinc-300">{tip}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
