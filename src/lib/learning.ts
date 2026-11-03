import { db } from "@/lib/db";
import { todayStr } from "@/lib/dates";
import { XP_RULES } from "@/lib/game/levels";
import { computeReadiness } from "@/lib/readiness";
import { useGameStore } from "@/store/useGameStore";
import { notifyUndo } from "@/components/ui/RewardToast";
import type { Flashcard } from "@/types";

/** Finds (or creates) a deck for a subject. PDF uploads will use the PDF name as the title. */
export async function ensureDeck(subjectId: number, title: string, sourcePdfName?: string): Promise<number> {
  const existing = await db.decks
    .where("subjectId")
    .equals(subjectId)
    .filter((d) => d.title === title)
    .first();
  if (existing?.id !== undefined) return existing.id;
  return db.decks.add({ subjectId, title, sourcePdfName });
}

export async function addCard(subjectId: number, front: string, back: string): Promise<void> {
  const f = front.trim();
  const b = back.trim();
  if (!f || !b) return;
  const deckId = await ensureDeck(subjectId, "Manual cards");
  await db.flashcards.add({ deckId, subjectId, front: f, back: b, source: "manual", timesCorrect: 0, timesWrong: 0 });
}

/** Saves AI-generated cards (after the student has reviewed them) into a deck named after the PDF. */
export async function addGeneratedCards(
  subjectId: number,
  deckTitle: string,
  cards: { front: string; back: string }[]
): Promise<number> {
  const clean = cards.filter((c) => c.front.trim() && c.back.trim());
  if (clean.length === 0) return 0;
  const deckId = await ensureDeck(subjectId, deckTitle, deckTitle);
  await db.flashcards.bulkAdd(
    clean.map((c) => ({
      deckId,
      subjectId,
      front: c.front.trim(),
      back: c.back.trim(),
      source: "ai" as const,
      timesCorrect: 0,
      timesWrong: 0,
    }))
  );
  return clean.length;
}

export async function updateCard(id: number, front: string, back: string): Promise<void> {
  await db.flashcards.update(id, { front: front.trim(), back: back.trim() });
}

export async function deleteCard(id: number): Promise<void> {
  await db.flashcards.delete(id);
}

/** Deletes one card and offers an Undo for a few seconds. */
export async function deleteCardWithUndo(card: Flashcard): Promise<void> {
  if (card.id === undefined) return;
  await db.flashcards.delete(card.id);
  notifyUndo("Flashcard deleted", () => {
    db.flashcards.put(card);
  });
}

/**
 * Deletes every flashcard of one subject (or of all subjects when no id is given).
 * Returns how many were removed. Offers an Undo that puts them all back.
 */
export async function deleteAllCards(subjectId?: number): Promise<number> {
  const removed =
    subjectId === undefined
      ? await db.flashcards.toArray()
      : await db.flashcards.where("subjectId").equals(subjectId).toArray();
  if (removed.length === 0) return 0;

  const ids = removed.map((c) => c.id).filter((id): id is number => id !== undefined);
  await db.flashcards.bulkDelete(ids);
  if (subjectId === undefined) await db.readiness.clear();
  else await db.readiness.delete(subjectId);

  notifyUndo(`Deleted ${removed.length} flashcard${removed.length === 1 ? "" : "s"}`, () => {
    db.flashcards.bulkPut(removed);
  });
  return removed.length;
}

/** Saves one answer (review or boss fight) and refreshes the subject's readiness row. */
export async function recordAnswer(cardId: number, correct: boolean): Promise<void> {
  const card = await db.flashcards.get(cardId);
  if (!card) return;
  await db.flashcards.update(cardId, {
    timesCorrect: card.timesCorrect + (correct ? 1 : 0),
    timesWrong: card.timesWrong + (correct ? 0 : 1),
    lastReviewed: new Date().toISOString(),
  });
  if (card.subjectId !== undefined) {
    const cards = await db.flashcards.where("subjectId").equals(card.subjectId).toArray();
    await db.readiness.put({
      subjectId: card.subjectId,
      score: computeReadiness(cards).score,
      updatedAt: new Date().toISOString(),
    });
  }
}

/** Records an answer and pays flashcard XP (once per card per day). Returns the XP earned. */
export async function gradeCard(card: Flashcard, correct: boolean): Promise<number> {
  if (card.id === undefined) return 0;
  await recordAnswer(card.id, correct);
  if (!correct) return 0;
  const result = useGameStore.getState().awardXp({
    source: "flashcard",
    xp: XP_RULES.flashcardCorrect,
    refId: `card:${card.id}:${todayStr()}`,
  });
  return result?.xp ?? 0;
}

export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Cards you have never seen first, then your weakest ones. */
export function weakestFirst(cards: Flashcard[]): Flashcard[] {
  const strength = (c: Flashcard) => {
    const n = c.timesCorrect + c.timesWrong;
    return n === 0 ? -1 : c.timesCorrect / n;
  };
  return [...cards].sort((a, b) => strength(a) - strength(b));
}
