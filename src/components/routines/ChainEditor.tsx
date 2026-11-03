"use client";

import { useState } from "react";
import { saveChain } from "@/lib/chains";
import { DAY_LABELS, TIME_BLOCKS } from "@/lib/chainLogic";
import type { Chain, ChainStep, Task, TimeBlock } from "@/types";

interface Row {
  key: number;
  title: string;
  minutes: string;
  linkedTaskId: string;
}

const field = "block w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm";
let rowKey = 1;
const blankRow = (): Row => ({ key: rowKey++, title: "", minutes: "5", linkedTaskId: "" });

const PRESETS: { label: string; days: number[] }[] = [
  { label: "Every day", days: [0, 1, 2, 3, 4, 5, 6] },
  { label: "Weekdays", days: [1, 2, 3, 4, 5] },
  { label: "Mon · Wed · Fri", days: [1, 3, 5] },
  { label: "2× a week (Tue · Thu)", days: [2, 4] },
];

export default function ChainEditor({
  editing,
  editingSteps,
  tasks,
  onDone,
}: {
  editing: Chain | null;
  editingSteps: ChainStep[];
  tasks: Task[];
  onDone: () => void;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [timeBlock, setTimeBlock] = useState<TimeBlock>(editing?.timeBlock ?? "morning");
  const [days, setDays] = useState<number[]>(editing?.days.length ? editing.days : [0, 1, 2, 3, 4, 5, 6]);
  const [rows, setRows] = useState<Row[]>(
    editingSteps.length
      ? editingSteps.map((s) => ({
          key: rowKey++,
          title: s.title,
          minutes: String(s.minutes),
          linkedTaskId: s.linkedTaskId !== undefined ? String(s.linkedTaskId) : "",
        }))
      : [blankRow()]
  );
  const [error, setError] = useState("");

  function patch(key: number, p: Partial<Row>) {
    setRows((r) => r.map((x) => (x.key === key ? { ...x, ...p } : x)));
  }

  function move(i: number, dir: -1 | 1) {
    setRows((r) => {
      const j = i + dir;
      if (j < 0 || j >= r.length) return r;
      const copy = [...r];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  function toggleDay(d: number) {
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Give your routine a name, like “Morning Prep”.");
    if (days.length === 0) return setError("Pick at least one day.");
    if (!rows.some((r) => r.title.trim())) return setError("Add at least one step.");

    await saveChain(
      {
        name,
        timeBlock,
        days,
        steps: rows.map((r) => ({
          title: r.title,
          minutes: Number(r.minutes) || 1,
          linkedTaskId: r.linkedTaskId ? Number(r.linkedTaskId) : undefined,
        })),
      },
      editing?.id
    );
    onDone();
  }

  return (
    <form onSubmit={submit} className="pop-in rounded-2xl bg-slate-50 p-4">
      <h3 className="text-sm font-bold text-slate-700">{editing ? "Edit routine" : "New routine"}</h3>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-slate-600">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nightly Reset" className={field} />
        </label>
        <label className="text-xs font-medium text-slate-600">
          Time of day
          <select value={timeBlock} onChange={(e) => setTimeBlock(e.target.value as TimeBlock)} className={field}>
            {(Object.keys(TIME_BLOCKS) as TimeBlock[]).map((b) => (
              <option key={b} value={b}>
                {TIME_BLOCKS[b].emoji} {TIME_BLOCKS[b].label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3">
        <div className="text-xs font-medium text-slate-600">Repeats on</div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {DAY_LABELS.map((label, d) => (
            <button
              key={label}
              type="button"
              onClick={() => toggleDay(d)}
              aria-pressed={days.includes(d)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                days.includes(d) ? "bg-emerald-600 text-white" : "bg-white text-slate-500 ring-1 ring-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setDays(p.days)}
              className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-600 ring-1 ring-slate-200 hover:bg-emerald-50"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <div className="text-xs font-medium text-slate-600">Steps (done in this order)</div>
        <ol className="mt-1 space-y-2">
          {rows.map((r, i) => (
            <li key={r.key} className="rounded-xl bg-white p-2.5 ring-1 ring-slate-200">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                  {i + 1}
                </span>
                <input
                  value={r.title}
                  onChange={(e) => patch(r.key, { title: e.target.value })}
                  placeholder="What do you do in this step?"
                  className={field}
                  aria-label={`Step ${i + 1} title`}
                />
                <label className="flex shrink-0 items-center gap-1 text-xs text-slate-500">
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={r.minutes}
                    onChange={(e) => patch(r.key, { minutes: e.target.value })}
                    className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                    aria-label={`Step ${i + 1} minutes`}
                  />
                  min
                </label>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 pl-8">
                <select
                  value={r.linkedTaskId}
                  onChange={(e) => patch(r.key, { linkedTaskId: e.target.value })}
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600"
                  aria-label={`Link step ${i + 1} to a task`}
                >
                  <option value="">🔗 Not linked to a task</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      🔗 {t.title}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded px-2 text-slate-500 disabled:opacity-30" aria-label="Move step up">
                  ↑
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="rounded px-2 text-slate-500 disabled:opacity-30" aria-label="Move step down">
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => setRows((cur) => (cur.length > 1 ? cur.filter((x) => x.key !== r.key) : cur))}
                  disabled={rows.length === 1}
                  className="rounded px-2 text-slate-400 hover:text-red-600 disabled:opacity-30"
                  aria-label="Remove step"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => setRows((r) => [...r, blankRow()])}
          className="mt-2 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50"
        >
          ＋ Add step
        </button>
      </div>

      {error && (
        <p className="shake-once mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white">
          {editing ? "Save routine" : "Create routine"}
        </button>
        <button type="button" onClick={onDone} className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-200">
          Cancel
        </button>
      </div>
    </form>
  );
}
