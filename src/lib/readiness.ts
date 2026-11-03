import type { Flashcard } from "@/types";

const DAY_MS = 86_400_000;

/** A review stops counting as "fresh" after this many days. */
export const RECENCY_DAYS = 14;

export interface ReadinessBreakdown {
  score: number; // 0 - 100
  accuracy: number; // 0 - 1, share of answers that were correct
  recency: number; // 0 - 1, how recently the cards were reviewed
  coverage: number; // 0 - 1, share of cards reviewed at least once
  label: string;
}

export function readinessLabel(score: number): string {
  if (score >= 90) return "Exam ready";
  if (score >= 70) return "Almost ready";
  if (score >= 40) return "Getting there";
  return "Not ready yet";
}

/**
 * Adaptive readiness for one subject:
 *   60% accuracy  (correct answers / all answers)
 *   20% recency   (each card fades to 0 over 14 days since its last review, so the score decays if you stop)
 *   20% coverage  (how much of the deck you have reviewed)
 * It goes up when you answer correctly and drops when you miss cards or stop studying.
 */
export function computeReadiness(cards: Flashcard[], now = Date.now()): ReadinessBreakdown {
  if (cards.length === 0) {
    return { score: 0, accuracy: 0, recency: 0, coverage: 0, label: readinessLabel(0) };
  }

  let correct = 0;
  let attempts = 0;
  let reviewed = 0;
  let recencySum = 0;

  for (const c of cards) {
    correct += c.timesCorrect;
    attempts += c.timesCorrect + c.timesWrong;
    if (c.lastReviewed) {
      reviewed++;
      const days = Math.max(0, (now - new Date(c.lastReviewed).getTime()) / DAY_MS);
      recencySum += Math.max(0, 1 - days / RECENCY_DAYS);
    }
  }

  const accuracy = attempts ? correct / attempts : 0;
  const recency = recencySum / cards.length;
  const coverage = reviewed / cards.length;
  const score = Math.round(100 * (0.6 * accuracy + 0.2 * recency + 0.2 * coverage));

  return { score, accuracy, recency, coverage, label: readinessLabel(score) };
}
