"use client";

import { useState } from "react";
import FlipCard from "@/components/ui/FlipCard";
import { fireConfetti } from "@/components/ui/Confetti";
import { recordAnswer, shuffle } from "@/lib/learning";
import { todayStr } from "@/lib/dates";
import { XP_RULES } from "@/lib/game/levels";
import { useGameStore } from "@/store/useGameStore";
import type { Flashcard } from "@/types";

const MIN_CARDS = 3;
const START_HEARTS = 5;

type Phase = "idle" | "fight" | "won" | "lost";

export default function ExamBoss({
  subjectId,
  subjectName,
  cards,
}: {
  subjectId: number;
  subjectName: string;
  cards: Flashcard[];
}) {
  const [size, setSize] = useState<"5" | "10" | "all">("10");
  const [phase, setPhase] = useState<Phase>("idle");
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [total, setTotal] = useState(0);
  const [defeated, setDefeated] = useState(0);
  const [hearts, setHearts] = useState(START_HEARTS);
  const [flipped, setFlipped] = useState(false);
  const [reward, setReward] = useState("");

  function start() {
    const count = size === "all" ? cards.length : Math.min(Number(size), cards.length);
    const picked = shuffle(cards).slice(0, count);
    setQueue(picked);
    setTotal(picked.length);
    setDefeated(0);
    setHearts(START_HEARTS);
    setFlipped(false);
    setReward("");
    setPhase("fight");
  }

  async function answer(correct: boolean) {
    const card = queue[0];
    if (!card) return;
    if (card.id !== undefined) await recordAnswer(card.id, correct);
    setFlipped(false);

    if (correct) {
      const rest = queue.slice(1);
      setDefeated((d) => d + 1);
      setQueue(rest);
      if (rest.length === 0) {
        // Boss reward pays once per subject per day.
        const result = useGameStore.getState().awardXp({
          source: "exam-boss",
          xp: XP_RULES.examBossDefeated,
          refId: `boss:${subjectId}:${todayStr()}`,
        });
        setReward(
          result
            ? `+${result.xp} XP and +${result.coins} coins!`
            : "You already claimed today's reward for this boss. Come back tomorrow for more XP."
        );
        setPhase("won");
        fireConfetti();
      }
    } else {
      // A missed card hurts you and comes back at the end of the fight.
      const left = hearts - 1;
      setHearts(left);
      if (left <= 0) {
        setPhase("lost");
      } else {
        setQueue([...queue.slice(1), card]);
      }
    }
  }

  if (cards.length < MIN_CARDS) {
    return (
      <p className="py-6 text-center text-sm text-slate-500">
        The {subjectName} boss needs at least {MIN_CARDS} flashcards to appear. You have {cards.length}.
      </p>
    );
  }

  const bossHp = total ? ((total - defeated) / total) * 100 : 100;

  if (phase === "idle") {
    return (
      <div className="py-6 text-center">
        <div className="text-6xl" aria-hidden>
          👹
        </div>
        <h3 className="mt-2 text-lg font-bold text-slate-800">{subjectName} Exam Boss</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
          Answer your flashcards to damage the boss. Knowing a card hits it. Missing one costs you a heart and the card
          comes back later. Lose all {START_HEARTS} hearts and the boss wins.
        </p>
        <div className="mt-3 flex items-center justify-center gap-2 text-sm">
          <label htmlFor="boss-size" className="text-slate-600">
            Difficulty
          </label>
          <select
            id="boss-size"
            value={size}
            onChange={(e) => setSize(e.target.value as typeof size)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5"
          >
            <option value="5">Easy (5 cards)</option>
            <option value="10">Normal (10 cards)</option>
            <option value="all">Hard (all {cards.length} cards)</option>
          </select>
        </div>
        <button onClick={start} className="mt-4 rounded-lg bg-red-600 px-6 py-2 font-bold text-white hover:bg-red-700">
          Fight!
        </button>
      </div>
    );
  }

  if (phase === "won" || phase === "lost") {
    const won = phase === "won";
    return (
      <div className="py-6 text-center">
        <div className="text-6xl" aria-hidden>
          {won ? "🏆" : "💀"}
        </div>
        <h3 className="mt-2 text-lg font-bold text-slate-800">{won ? "Boss defeated!" : "The boss won this round"}</h3>
        <p className="mt-1 text-sm text-slate-600">
          {won ? reward : `You knocked out ${defeated} of ${total} cards. Review the ones you missed and try again.`}
        </p>
        <button onClick={start} className="mt-4 rounded-lg bg-emerald-600 px-5 py-2 font-semibold text-white hover:bg-emerald-700">
          {won ? "Fight again" : "Try again"}
        </button>
        <button onClick={() => setPhase("idle")} className="ml-2 rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
          Back
        </button>
      </div>
    );
  }

  const card = queue[0];

  return (
    <div className="mx-auto max-w-xl py-2">
      <div className="flex items-center gap-3">
        <span key={defeated} className={`text-5xl ${defeated > 0 ? "shake-once" : "bob"}`} aria-hidden>
          {bossHp <= 30 ? "😵" : "👹"}
        </span>
        <div className="flex-1">
          <div className="flex justify-between text-xs font-semibold text-slate-600">
            <span>{subjectName} Exam Boss</span>
            <span>
              {total - defeated} / {total} HP
            </span>
          </div>
          <div className="mt-1 h-3 overflow-hidden rounded-full bg-red-100">
            <div className="h-full rounded-full bg-red-500 transition-all duration-500" style={{ width: `${bossHp}%` }} />
          </div>
        </div>
        <div key={hearts} className={`text-lg ${hearts < START_HEARTS ? "shake-once" : ""}`} aria-label={`${hearts} hearts left`}>
          {"❤️".repeat(hearts)}
          {"🖤".repeat(START_HEARTS - hearts)}
        </div>
      </div>

      <div className="mt-4">
        <FlipCard
          front={card.front}
          back={card.back}
          flipped={flipped}
          onFlip={() => setFlipped(true)}
          tone="red"
          hint="Think of your answer, then tap to check it"
        />
      </div>

      {flipped && (
        <div className="mt-4 flex justify-center gap-3">
          <button onClick={() => answer(false)} className="rounded-lg bg-red-100 px-5 py-2 font-semibold text-red-700 hover:bg-red-200">
            I missed it
          </button>
          <button onClick={() => answer(true)} className="rounded-lg bg-emerald-600 px-5 py-2 font-semibold text-white hover:bg-emerald-700">
            I knew it! Attack
          </button>
        </div>
      )}
    </div>
  );
}
