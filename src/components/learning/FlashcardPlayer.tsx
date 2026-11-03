"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import FlipCard from "@/components/ui/FlipCard";
import { gradeCard, shuffle } from "@/lib/learning";
import type { Flashcard } from "@/types";

type Slide = "left" | "right";

// Pop-up flashcard viewer: tap to flip, swipe or use arrow keys to move around,
// shuffle the deck, and rate yourself on each card.
export default function FlashcardPlayer({
  cards,
  title,
  startIndex = 0,
  onClose,
}: {
  cards: Flashcard[];
  title: string;
  startIndex?: number;
  onClose: () => void;
}) {
  const [deck, setDeck] = useState(cards);
  const [index, setIndex] = useState(Math.min(startIndex, Math.max(0, cards.length - 1)));
  const [flipped, setFlipped] = useState(false);
  const [slide, setSlide] = useState<Slide>("right");
  const [rated, setRated] = useState<Record<number, boolean>>({});
  const dragStart = useRef<number | null>(null);

  const card = deck[index];
  const total = deck.length;

  const go = useCallback(
    (dir: 1 | -1) => {
      setIndex((i) => {
        const next = i + dir;
        if (next < 0 || next >= total) return i;
        setSlide(dir === 1 ? "right" : "left");
        setFlipped(false);
        return next;
      });
    },
    [total]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === " " || e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
    }
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [go, onClose]);

  function doShuffle() {
    setDeck((d) => shuffle(d));
    setIndex(0);
    setFlipped(false);
    setSlide("right");
  }

  async function rate(correct: boolean) {
    if (!card || card.id === undefined) return;
    const id = card.id;
    await gradeCard(card, correct); // pays the XP (and shows the toast) through the game store
    setRated((r) => ({ ...r, [id]: correct }));
    if (index < total - 1) go(1);
  }

  function onPointerDown(e: React.PointerEvent) {
    dragStart.current = e.clientX;
  }
  function onPointerUp(e: React.PointerEvent) {
    if (dragStart.current === null) return;
    const dx = e.clientX - dragStart.current;
    dragStart.current = null;
    if (Math.abs(dx) > 70) go(dx < 0 ? 1 : -1);
  }

  if (!card) return null;

  const ratedCount = Object.keys(rated).length;
  const correctCount = Object.values(rated).filter(Boolean).length;
  const thisRating = card.id !== undefined ? rated[card.id] : undefined;

  // Rendered on document.body so no parent card can clip or offset the popup.
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Flashcards: ${title}`}
      onClick={onClose}
    >
      <div
        className="pop-in w-full max-w-xl rounded-3xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-slate-800">{title}</div>
            <div className="text-xs text-slate-500">
              Card {index + 1} of {total}
              {ratedCount > 0 && ` · ${correctCount}/${ratedCount} known`}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={doShuffle}
              className="rounded-lg bg-violet-100 px-3 py-1.5 text-sm font-semibold text-violet-700 hover:bg-violet-200"
              title="Shuffle the cards"
            >
              🔀 Shuffle
            </button>
            <button
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-lg leading-none text-slate-500 hover:bg-slate-100"
              aria-label="Close flashcards"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-300"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>

        <div
          key={`${card.id}-${index}`}
          className={`mt-4 touch-pan-y select-none ${slide === "right" ? "slide-from-right" : "slide-from-left"}`}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (dragStart.current = null)}
        >
          <FlipCard front={card.front} back={card.back} flipped={flipped} onFlip={() => setFlipped((f) => !f)} />
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            onClick={() => go(-1)}
            disabled={index === 0}
            className="rounded-xl bg-slate-100 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous card"
          >
            ← Prev
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => rate(false)}
              className={`rounded-xl px-4 py-2 font-semibold ${
                thisRating === false ? "bg-red-600 text-white" : "bg-red-100 text-red-700 hover:bg-red-200"
              }`}
            >
              😅 Missed
            </button>
            <button
              onClick={() => rate(true)}
              className={`rounded-xl px-4 py-2 font-semibold ${
                thisRating === true ? "bg-emerald-700 text-white" : "bg-emerald-600 text-white hover:bg-emerald-700"
              }`}
            >
              ✅ Got it
            </button>
          </div>

          <button
            onClick={() => go(1)}
            disabled={index === total - 1}
            className="rounded-xl bg-slate-100 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next card"
          >
            Next →
          </button>
        </div>

        <p className="mt-3 text-center text-xs text-slate-400">
          Click the card or press Space to flip · swipe or use ← → to move · Esc to close
        </p>
      </div>
    </div>,
    document.body
  );
}
