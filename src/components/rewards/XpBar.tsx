"use client";

import { useGameStore } from "@/store/useGameStore";
import { levelProgress } from "@/lib/game/levels";

export default function XpBar() {
  const xp = useGameStore((s) => s.xp);
  const { level, current, needed, pct } = levelProgress(xp);

  return (
    <div className="w-full min-w-[180px]">
      <div className="mb-1 flex items-center justify-between text-xs font-semibold">
        <span className="text-emerald-700">Level {level}</span>
        <span className="text-slate-500">
          {current} / {needed} XP
        </span>
      </div>
      <div
        className="h-3 w-full overflow-hidden rounded-full bg-emerald-100"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="XP progress to next level"
      >
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
