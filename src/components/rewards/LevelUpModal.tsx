"use client";

import { useEffect } from "react";
import { useGameStore } from "@/store/useGameStore";
import { PLANT_STAGE_EMOJI, PLANT_STAGE_LABEL } from "@/lib/game/levels";
import { fireConfetti } from "@/components/ui/Confetti";

export default function LevelUpModal() {
  const pendingLevelUp = useGameStore((s) => s.pendingLevelUp);
  const plantStage = useGameStore((s) => s.plantStage);
  const dismiss = useGameStore((s) => s.dismissLevelUp);

  useEffect(() => {
    if (pendingLevelUp !== null) fireConfetti();
  }, [pendingLevelUp]);

  useEffect(() => {
    if (pendingLevelUp === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "Enter") dismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingLevelUp, dismiss]);

  if (pendingLevelUp === null) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Level up"
      onClick={dismiss}
    >
      <div
        className="pop-in w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bob text-7xl" aria-hidden>
          {PLANT_STAGE_EMOJI[plantStage]}
        </div>
        <h2 className="mt-3 bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-3xl font-extrabold text-transparent">
          Level up!
        </h2>
        <p className="mt-1 text-slate-600">
          You reached <span className="font-bold">Level {pendingLevelUp}</span>
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Your plant is now a {PLANT_STAGE_LABEL[plantStage].toLowerCase()}.
        </p>
        <button
          onClick={dismiss}
          autoFocus
          className="mt-5 rounded-xl bg-emerald-600 px-6 py-2.5 font-semibold text-white"
        >
          Keep going 🚀
        </button>
      </div>
    </div>
  );
}
