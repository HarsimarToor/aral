"use client";

import { useState } from "react";
import { addSubject, deleteSubject } from "@/lib/tasks";
import { confirmDialog } from "@/components/ui/ConfirmHost";
import type { Subject, Task } from "@/types";

// Progress per subject = completed to-dos / all to-dos under that subject.
// Dailies and habits repeat forever, so they are not counted here.
export default function SubjectProgress({ subjects, tasks }: { subjects: Subject[]; tasks: Task[] }) {
  const [name, setName] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await addSubject(name);
    setName("");
  }

  return (
    <section className="section-card accent-sky">
      <h2 className="text-lg font-bold text-slate-800">📊 Subject progress</h2>

      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add a subject, e.g. Marketing Management"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        />
        <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700">
          Add
        </button>
      </form>

      {subjects.length === 0 ? (
        <div className="mt-4 rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center">
          <div className="bob text-4xl" aria-hidden>
            📚
          </div>
          <p className="mt-1 font-semibold text-slate-700">No subjects yet</p>
          <p className="text-sm text-slate-500">Add one above, then assign your to-dos to it to see its progress bar fill up.</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-4">
          {subjects.map((s) => {
            const mine = tasks.filter((t) => t.subjectId === s.id && t.type === "todo");
            const done = mine.filter((t) => t.done).length;
            const pct = mine.length ? Math.round((done / mine.length) * 100) : 0;
            return (
              <li key={s.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium text-slate-700">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </span>
                  <span className="flex items-center gap-3 text-slate-500">
                    {done}/{mine.length} · {pct}%
                    <button
                      onClick={async () => {
                        if (s.id === undefined) return;
                        const ok = await confirmDialog({
                          title: `Remove "${s.name}"?`,
                          message: "Its tasks stay (with no subject), but its flashcards will be deleted.",
                          confirmLabel: "Remove subject",
                        });
                        if (ok) await deleteSubject(s.id);
                      }}
                      className="text-xs text-slate-400 hover:text-red-600"
                      aria-label={`Delete subject ${s.name}`}
                    >
                      Remove
                    </button>
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: s.color }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
