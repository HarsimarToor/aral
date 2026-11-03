"use client";

import { useState } from "react";
import { addCard, deleteAllCards, deleteCardWithUndo, shuffle, updateCard } from "@/lib/learning";
import { confirmDialog } from "@/components/ui/ConfirmHost";
import FlashcardPlayer from "./FlashcardPlayer";
import type { Flashcard } from "@/types";

const area = "mt-0.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm";

export default function CardManager({
  subjectId,
  subjectName,
  cards,
  totalCount,
}: {
  subjectId: number;
  subjectName: string;
  cards: Flashcard[];
  /** Flashcards across ALL subjects (used for the "delete everything" button). */
  totalCount: number;
}) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [editing, setEditing] = useState<Flashcard | null>(null);
  const [player, setPlayer] = useState<{ cards: Flashcard[]; index: number } | null>(null);

  function startEdit(c: Flashcard) {
    setEditing(c);
    setFront(c.front);
    setBack(c.back);
  }

  function reset() {
    setEditing(null);
    setFront("");
    setBack("");
  }

  async function removeAll(everySubject: boolean) {
    const count = everySubject ? totalCount : cards.length;
    const ok = await confirmDialog({
      title: everySubject
        ? `Delete all ${count} flashcards in every subject?`
        : `Delete all ${count} flashcard${count === 1 ? "" : "s"} in ${subjectName}?`,
      message: "Your review history for these cards goes too. You can press Undo right after.",
      confirmLabel: "Delete all",
    });
    if (!ok) return;
    reset();
    await deleteAllCards(everySubject ? undefined : subjectId);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    if (editing?.id !== undefined) await updateCard(editing.id, front, back);
    else await addCard(subjectId, front, back);
    reset();
  }

  return (
    <div>
      {cards.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-50 to-emerald-50 p-4">
          <div className="mr-auto">
            <div className="text-sm font-bold text-slate-800">
              {cards.length} flashcard{cards.length === 1 ? "" : "s"} ready
            </div>
            <div className="text-xs text-slate-500">Open them as pop-up cards you can flip, swipe and shuffle.</div>
          </div>
          <button
            onClick={() => setPlayer({ cards, index: 0 })}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
          >
            ▶ Study cards
          </button>
          <button
            onClick={() => setPlayer({ cards: shuffle(cards), index: 0 })}
            className="rounded-xl bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-200"
          >
            🔀 Shuffle &amp; study
          </button>
          <button
            onClick={() => removeAll(false)}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-50"
            title={`Delete every flashcard in ${subjectName}`}
          >
            🗑 Delete all ({cards.length})
          </button>
          {totalCount > cards.length && (
            <button
              onClick={() => removeAll(true)}
              className="rounded-xl px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50"
              title="Delete the flashcards of every subject"
            >
              Delete in all subjects ({totalCount})
            </button>
          )}
        </div>
      )}

      <form onSubmit={submit} className="rounded-xl bg-slate-50 p-4">
        <h3 className="text-sm font-bold text-slate-700">{editing ? "Edit flashcard" : "Add a flashcard manually"}</h3>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium text-slate-600">
            Front (question or term)
            <textarea value={front} onChange={(e) => setFront(e.target.value)} rows={2} className={area} required />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Back (answer or explanation)
            <textarea value={back} onChange={(e) => setBack(e.target.value)} rows={2} className={area} required />
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          <button className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white">
            {editing ? "Save card" : "＋ Add flashcard"}
          </button>
          {editing && (
            <button type="button" onClick={reset} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200">
              Cancel
            </button>
          )}
        </div>
      </form>

      {cards.length === 0 ? (
        <div className="mt-6 rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
          <div className="bob text-5xl" aria-hidden>
            🃏
          </div>
          <p className="mt-2 font-semibold text-slate-700">No flashcards for {subjectName} yet</p>
          <p className="text-sm text-slate-500">Add one above, or open the “From PDF” tab to make them from your notes.</p>
        </div>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {cards.map((c, i) => {
            const tries = c.timesCorrect + c.timesWrong;
            return (
              <li
                key={c.id}
                role="button"
                tabIndex={0}
                aria-label={`Open flashcard: ${c.front}`}
                onClick={() => setPlayer({ cards, index: i })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setPlayer({ cards, index: i });
                  }
                }}
                className="lift cursor-pointer rounded-xl border border-slate-200 bg-white p-3"
              >
                <div className="text-sm font-semibold text-slate-800">{c.front}</div>
                <div className="mt-1 text-sm text-slate-600">{c.back}</div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    {c.source === "ai" ? "✨ AI" : "✍️ Manual"} ·{" "}
                    {tries === 0 ? "not reviewed" : `${c.timesCorrect}/${tries} correct`}
                  </span>
                  <span className="flex gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(c);
                      }}
                      className="hover:text-emerald-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCardWithUndo(c);
                      }}
                      className="hover:text-red-600"
                      aria-label={`Delete card ${c.front}`}
                    >
                      Delete
                    </button>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {player && (
        <FlashcardPlayer
          cards={player.cards}
          startIndex={player.index}
          title={`${subjectName} flashcards`}
          onClose={() => setPlayer(null)}
        />
      )}
    </div>
  );
}
