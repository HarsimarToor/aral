"use client";

import { useState } from "react";
import FlipCard from "@/components/ui/FlipCard";
import { fireConfetti } from "@/components/ui/Confetti";
import { gradeCard, weakestFirst } from "@/lib/learning";
import type { Flashcard } from "@/types";

const SESSION_SIZE = 20;

export default function ReviewMode({ cards }: { cards: Flashcard[] }) {
  const [session, setSession] = useState<Flashcard[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);

  function start() {
    setSession(weakestFirst(cards).slice(0, SESSION_SIZE));
    setIndex(0);
    setFlipped(false);
    setCorrect(0);
    setXpEarned(0);
  }

  async function answer(gotIt: boolean) {
    if (!session) return;
    const xp = await gradeCard(session[index], gotIt);
    if (xp > 0) setXpEarned((x) => x + xp);

    const newCorrect = correct + (gotIt ? 1 : 0);
    if (gotIt) setCorrect(newCorrect);
    if (index + 1 >= session.length && newCorrect / session.length >= 0.7) fireConfetti();

    setFlipped(false);
    setIndex((i) => i + 1);
  }

  if (cards.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
        <div className="bob text-5xl" aria-hidden>
          📖
        </div>
        <p className="mt-2 font-semibold text-slate-700">Nothing to review yet</p>
        <p className="text-sm text-slate-500">Add some flashcards first, then come back to review them.</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="py-6 text-center">
        <div className="bob text-5xl" aria-hidden>
          🧠
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Review up to {Math.min(SESSION_SIZE, cards.length)} cards. New and weak cards come first.
        </p>
        <button onClick={start} className="mt-3 rounded-xl bg-emerald-600 px-6 py-2.5 font-semibold text-white">
          Start review
        </button>
      </div>
    );
  }

  if (index >= session.length) {
    const pct = Math.round((correct / session.length) * 100);
    return (
      <div className="pop-in py-6 text-center">
        <div className="text-5xl">{pct >= 70 ? "🎉" : "💪"}</div>
        <h3 className="mt-2 text-lg font-bold text-slate-800">Session complete</h3>
        <p className="mt-1 text-sm text-slate-600">
          You knew {correct} of {session.length} cards ({pct}%). {xpEarned > 0 ? `+${xpEarned} XP earned.` : ""}
        </p>
        <button onClick={start} className="mt-3 rounded-xl bg-emerald-600 px-6 py-2.5 font-semibold text-white">
          Review again
        </button>
      </div>
    );
  }

  const card = session[index];

  return (
    <div className="mx-auto max-w-xl py-2">
      <div className="mb-2 flex justify-between text-xs text-slate-500">
        <span>
          Card {index + 1} of {session.length}
        </span>
        <span>{correct} correct</span>
      </div>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500"
          style={{ width: `${(index / session.length) * 100}%` }}
        />
      </div>

      <div key={index} className="slide-from-right">
        <FlipCard front={card.front} back={card.back} flipped={flipped} onFlip={() => setFlipped((f) => !f)} />
      </div>

      <div className="mt-4 flex min-h-11 justify-center gap-3">
        {flipped ? (
          <>
            <button onClick={() => answer(false)} className="rounded-xl bg-red-100 px-5 py-2 font-semibold text-red-700 hover:bg-red-200">
              😅 Missed it
            </button>
            <button onClick={() => answer(true)} className="rounded-xl bg-emerald-600 px-5 py-2 font-semibold text-white">
              ✅ Got it
            </button>
          </>
        ) : (
          <p className="self-center text-xs text-slate-400">Think of your answer, then click the card to check it.</p>
        )}
      </div>
    </div>
  );
}
