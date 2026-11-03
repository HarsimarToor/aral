"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { addSubject } from "@/lib/tasks";
import { computeReadiness } from "@/lib/readiness";
import CardManager from "./CardManager";
import ReviewMode from "./ReviewMode";
import ExamBoss from "./ExamBoss";
import ReadinessCard from "./ReadinessCard";
import PdfFlashcardGenerator from "./PdfFlashcardGenerator";

type Tab = "cards" | "pdf" | "review" | "boss";

const TABS: { id: Tab; label: string }[] = [
  { id: "cards", label: "Flashcards" },
  { id: "pdf", label: "From PDF" },
  { id: "review", label: "Review" },
  { id: "boss", label: "Exam boss" },
];

export default function LearningSection() {
  const subjects = useLiveQuery(() => db.subjects.toArray(), []);
  const allCards = useLiveQuery(() => db.flashcards.toArray(), []);
  const [selected, setSelected] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("cards");
  const [newSubject, setNewSubject] = useState("");

  if (!subjects || !allCards) {
    return (
      <section id="learning" className="scroll-mt-24 section-card accent-violet">
        <h2 className="text-lg font-bold text-slate-800">🧠 Learning</h2>
        <p className="mt-2 text-sm text-slate-500">Loading...</p>
      </section>
    );
  }

  const activeId = selected ?? subjects[0]?.id ?? null;
  const active = subjects.find((s) => s.id === activeId);
  const cards = allCards.filter((c) => c.subjectId === activeId);

  async function submitSubject(e: React.FormEvent) {
    e.preventDefault();
    await addSubject(newSubject);
    setNewSubject("");
  }

  return (
    <section id="learning" className="scroll-mt-24 section-card accent-violet">
      <h2 className="text-lg font-bold text-slate-800">🧠 Learning</h2>
      <p className="text-sm text-slate-500">Flashcards by subject, a readiness score, and an exam boss to beat.</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {subjects.map((s) => {
          const score = computeReadiness(allCards.filter((c) => c.subjectId === s.id)).score;
          const on = s.id === activeId;
          return (
            <button
              key={s.id}
              onClick={() => setSelected(s.id ?? null)}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${
                on ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              {s.name}
              <span className={`text-xs ${on ? "text-emerald-100" : "text-slate-400"}`}>{score}%</span>
            </button>
          );
        })}
        <form onSubmit={submitSubject} className="flex gap-1">
          <input
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            placeholder="New subject"
            className="w-36 rounded-full border border-slate-300 px-3 py-1.5 text-sm"
            aria-label="New subject name"
          />
          <button className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200">+</button>
        </form>
      </div>

      {!active || activeId === null ? (
        <p className="mt-6 text-center text-sm text-slate-500">Add a subject above to start making flashcards.</p>
      ) : (
        <div className="mt-4 space-y-4">
          <ReadinessCard cards={cards} subjectName={active.name} />

          <div className="flex gap-1 border-b border-slate-200">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${
                  tab === t.id ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {t.label}
                {t.id === "cards" && <span className="ml-1 text-xs text-slate-400">({cards.length})</span>}
              </button>
            ))}
          </div>

          {tab === "cards" && (
            <CardManager
              key={activeId}
              subjectId={activeId}
              subjectName={active.name}
              cards={cards}
              totalCount={allCards.length}
            />
          )}
          {tab === "pdf" && (
            <PdfFlashcardGenerator
              key={activeId}
              subjectId={activeId}
              subjectName={active.name}
              onSaved={() => setTab("cards")}
            />
          )}
          {tab === "review" &&<ReviewMode key={activeId} cards={cards} />}
          {tab === "boss" && <ExamBoss key={activeId} subjectId={activeId} subjectName={active.name} cards={cards} />}
        </div>
      )}
    </section>
  );
}
