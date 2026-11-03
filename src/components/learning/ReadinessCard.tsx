"use client";

import { computeReadiness } from "@/lib/readiness";
import type { Flashcard } from "@/types";

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  );
}

export default function ReadinessCard({ cards, subjectName }: { cards: Flashcard[]; subjectName: string }) {
  const r = computeReadiness(cards);
  const tone = r.score >= 70 ? "text-emerald-600" : r.score >= 40 ? "text-amber-600" : "text-red-600";
  const bar = r.score >= 70 ? "bg-emerald-500" : r.score >= 40 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-bold text-slate-700">Exam readiness: {subjectName}</h3>
        <span className={`text-sm font-semibold ${tone}`}>{r.label}</span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className={`text-4xl font-extrabold ${tone}`}>{r.score}</div>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200">
          <div className={`h-full rounded-full transition-all duration-500 ${bar}`} style={{ width: `${r.score}%` }} />
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Bar label="Accuracy (60%)" value={r.accuracy} color="bg-emerald-500" />
        <Bar label="Recent review (20%)" value={r.recency} color="bg-blue-500" />
        <Bar label="Deck covered (20%)" value={r.coverage} color="bg-violet-500" />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Rises when you answer correctly and fades if you stop reviewing for a couple of weeks.
      </p>
    </div>
  );
}
