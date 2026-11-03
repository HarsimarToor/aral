"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { completeChain, completeStep, type ChainResult } from "@/lib/chains";
import { fireConfetti } from "@/components/ui/Confetti";
import type { Chain, ChainStep, Task } from "@/types";

type Outcome = { kind: "done"; result: ChainResult } | { kind: "already" } | { kind: "partial"; skipped: number };

function mmss(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Immersive "Focus Flow": one step at a time, with a timer, then straight on to the next step.
export default function FocusFlow({
  chain,
  steps,
  tasks,
  onClose,
}: {
  chain: Chain;
  steps: ChainStep[];
  tasks: Task[];
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(steps[0].minutes * 60);
  const [running, setRunning] = useState(true);
  const [skipped, setSkipped] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);

  const step = steps[idx];
  const total = step.minutes * 60;
  const linked = tasks.find((t) => t.id === step.linkedTaskId);
  const timeUp = left === 0;

  // New step: reset the timer and start it.
  useEffect(() => {
    setLeft(step.minutes * 60);
    setRunning(true);
  }, [idx, step.minutes]);

  // Count down once per second.
  useEffect(() => {
    if (!running || outcome) return;
    const id = window.setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => window.clearInterval(id);
  }, [running, outcome]);

  useEffect(() => {
    if (left === 0) setRunning(false);
  }, [left]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  async function advance(didIt: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      if (didIt) await completeStep(step);
      const skippedNow = skipped + (didIt ? 0 : 1);
      setSkipped(skippedNow);

      if (idx < steps.length - 1) {
        setIdx(idx + 1);
        return;
      }

      if (skippedNow > 0) {
        setOutcome({ kind: "partial", skipped: skippedNow });
      } else {
        const result = chain.id !== undefined ? await completeChain(chain.id) : null;
        if (result) {
          setOutcome({ kind: "done", result });
          fireConfetti();
        } else {
          setOutcome({ kind: "already" });
        }
      }
    } finally {
      setBusy(false);
    }
  }

  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const fraction = total > 0 ? left / total : 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-y-auto bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 p-4 text-white"
      role="dialog"
      aria-modal="true"
      aria-label={`Focus Flow: ${chain.name}`}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/20"
      >
        ✕ Exit
      </button>

      {outcome ? (
        <div className="pop-in w-full max-w-md text-center">
          <div className="bob text-7xl" aria-hidden>
            {outcome.kind === "done" ? "🏆" : outcome.kind === "partial" ? "👍" : "✅"}
          </div>
          <h2 className="mt-4 text-3xl font-extrabold">
            {outcome.kind === "partial" ? "Routine finished" : `${chain.name} complete!`}
          </h2>

          {outcome.kind === "done" && (
            <div className="mt-4 space-y-2 text-emerald-100">
              <p className="text-lg font-bold">
                +{outcome.result.xp} XP · +{outcome.result.coins} coins
              </p>
              <p>🔥 {outcome.result.streak}-day streak</p>
              {outcome.result.shieldsUsed > 0 && (
                <p>
                  🛡️ {outcome.result.shieldsUsed} streak shield{outcome.result.shieldsUsed === 1 ? "" : "s"} protected your
                  streak
                </p>
              )}
              {outcome.result.earnedShield && <p>🛡️ You earned a new streak shield for reaching a 7-day milestone!</p>}
            </div>
          )}
          {outcome.kind === "already" && (
            <p className="mt-3 text-emerald-100">You already earned today&apos;s reward for this routine. Nice extra practice!</p>
          )}
          {outcome.kind === "partial" && (
            <p className="mt-3 text-emerald-100">
              You skipped {outcome.skipped} step{outcome.skipped === 1 ? "" : "s"}, so today does not count toward the
              streak. Finish every step next time to keep it growing.
            </p>
          )}

          <button onClick={onClose} className="mt-6 rounded-xl bg-white px-6 py-2.5 font-bold text-emerald-800">
            Back to dashboard
          </button>
        </div>
      ) : (
        <div className="w-full max-w-md text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-200">{chain.name}</p>
          <div className="mt-2 flex justify-center gap-1.5" aria-label={`Step ${idx + 1} of ${steps.length}`}>
            {steps.map((s, i) => (
              <span
                key={s.id ?? i}
                className={`h-2 rounded-full transition-all ${
                  i < idx ? "w-6 bg-emerald-400" : i === idx ? "w-10 bg-white" : "w-6 bg-white/25"
                }`}
              />
            ))}
          </div>
          <p className="mt-1 text-xs text-emerald-200">
            Step {idx + 1} of {steps.length}
          </p>

          <div key={idx} className="slide-from-right">
            <h2 className="mx-auto mt-6 max-w-sm text-2xl font-extrabold leading-snug sm:text-3xl">{step.title}</h2>

            <div className={`relative mx-auto mt-6 h-52 w-52 ${timeUp ? "shake-once" : ""}`}>
              <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90" aria-hidden>
                <circle cx="100" cy="100" r={radius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="10" />
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke={timeUp ? "#fbbf24" : "#34d399"}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - fraction)}
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-extrabold tabular-nums">{mmss(left)}</span>
                <span className="text-xs text-emerald-200">{timeUp ? "⏰ Time's up!" : running ? "Focus..." : "Paused"}</span>
              </div>
            </div>
          </div>

          {linked && (
            <p className="mt-4 rounded-xl bg-white/10 px-3 py-2 text-sm text-emerald-100">
              🔗 Linked task: <span className="font-semibold">{linked.title}</span>. Finishing this step ticks it off.
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setRunning((r) => !r)}
              disabled={timeUp}
              className="rounded-xl bg-white/10 px-4 py-2 font-semibold text-white hover:bg-white/20 disabled:opacity-40"
            >
              {running ? "⏸ Pause" : "▶ Resume"}
            </button>
            <button
              onClick={() => {
                setLeft((l) => l + 60);
                setRunning(true);
              }}
              className="rounded-xl bg-white/10 px-4 py-2 font-semibold text-white hover:bg-white/20"
            >
              ＋1 min
            </button>
            <button
              onClick={() => advance(false)}
              disabled={busy}
              className="rounded-xl bg-white/10 px-4 py-2 font-semibold text-white hover:bg-white/20 disabled:opacity-40"
            >
              Skip
            </button>
            <button
              onClick={() => advance(true)}
              disabled={busy}
              className="rounded-xl bg-emerald-600 px-6 py-2.5 font-bold text-white disabled:opacity-60"
            >
              {idx === steps.length - 1 ? "✓ Finish routine" : "✓ Done, next step"}
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
