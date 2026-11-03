"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { todayStr } from "@/lib/dates";
import { addSubject, addTask } from "@/lib/tasks";
import { addCard } from "@/lib/learning";
import { CATEGORY_LABEL, QUICK_EXPENSES, peso } from "@/lib/allowance";
import { notifyReward } from "@/components/ui/RewardToast";
import type { ExpenseCategory, Priority, TaskType } from "@/types";

type Tab = "task" | "expense" | "card";

const field = "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
const label = "text-xs font-medium text-slate-600";

function Seg<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="mt-1 flex gap-1 rounded-xl bg-slate-100 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold ${
            value === o.value ? "bg-white text-emerald-700 shadow" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function TaskTab() {
  const subjects = useLiveQuery(() => db.subjects.toArray(), []);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TaskType>("todo");
  const [priority, setPriority] = useState<Priority>("medium");
  const [due, setDue] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await addTask({
      title,
      type,
      priority,
      dueDate: due || undefined,
      subjectId: subjectId ? Number(subjectId) : undefined,
    });
    notifyReward(`Added "${title.trim()}"`, "📝");
    setTitle("");
    titleRef.current?.focus();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className={label}>
        What do you need to do?
        <input ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="e.g. Submit marketing paper" className={`${field} mt-1`} />
      </label>
      <div className={label}>
        Type
        <Seg
          value={type}
          onChange={setType}
          options={[
            { value: "todo", label: "To-do" },
            { value: "daily", label: "Daily" },
            { value: "habit", label: "Habit" },
          ]}
        />
      </div>
      <div className={label}>
        Priority
        <Seg
          value={priority}
          onChange={setPriority}
          options={[
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
          ]}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className={label}>
          Due date
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={`${field} mt-1`} />
        </label>
        <label className={label}>
          Subject
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={`${field} mt-1`}>
            <option value="">No subject</option>
            {(subjects ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white">＋ Add task</button>
    </form>
  );
}

function ExpenseTab() {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayStr());
  const amountRef = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    await db.expenses.add({ date, category, note: note.trim(), amount: amt });
    notifyReward(`${peso(amt)} logged`, "💸");
    setAmount("");
    setNote("");
    amountRef.current?.focus();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {QUICK_EXPENSES.map((q) => (
          <button
            key={q.label}
            type="button"
            onClick={() => {
              setCategory(q.category);
              setNote(q.note);
              amountRef.current?.focus();
            }}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-emerald-100 hover:text-emerald-700"
          >
            + {q.label}
          </button>
        ))}
      </div>
      <label className={label}>
        Amount (₱)
        <input ref={amountRef} type="number" min={0.01} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus className={`${field} mt-1`} required />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={label}>
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)} className={`${field} mt-1`}>
            {(Object.keys(CATEGORY_LABEL) as ExpenseCategory[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${field} mt-1`} required />
        </label>
      </div>
      <label className={label}>
        Note (optional)
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Jeepney to school" className={`${field} mt-1`} />
      </label>
      <button className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white">💸 Log expense</button>
    </form>
  );
}

function CardTab() {
  const subjects = useLiveQuery(() => db.subjects.toArray(), []);
  const [subjectId, setSubjectId] = useState("");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const frontRef = useRef<HTMLTextAreaElement>(null);

  if (!subjects) return <p className="text-sm text-slate-500">Loading...</p>;

  if (subjects.length === 0) {
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await addSubject(newSubject);
          setNewSubject("");
        }}
        className="space-y-3 text-center"
      >
        <div className="text-4xl">📚</div>
        <p className="text-sm text-slate-600">Flashcards belong to a subject. Create your first one:</p>
        <input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} autoFocus placeholder="e.g. Marketing Management" className={field} />
        <button className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white">Create subject</button>
      </form>
    );
  }

  const chosen = subjectId || String(subjects[0].id);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    await addCard(Number(chosen), front, back);
    notifyReward("Flashcard added", "🃏");
    setFront("");
    setBack("");
    frontRef.current?.focus();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className={label}>
        Subject
        <select value={chosen} onChange={(e) => setSubjectId(e.target.value)} className={`${field} mt-1`}>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className={label}>
        Front (question or term)
        <textarea ref={frontRef} value={front} onChange={(e) => setFront(e.target.value)} rows={2} autoFocus className={`${field} mt-1`} required />
      </label>
      <label className={label}>
        Back (answer)
        <textarea value={back} onChange={(e) => setBack(e.target.value)} rows={2} className={`${field} mt-1`} required />
      </label>
      <button className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white">🃏 Add flashcard</button>
    </form>
  );
}

function QuickAddDialog({ initialTab, onClose }: { initialTab: Tab; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "task", label: "📝 Task" },
    { id: "expense", label: "💸 Expense" },
    { id: "card", label: "🃏 Flashcard" },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 p-3 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Quick add"
      onClick={onClose}
    >
      <div className="pop-in max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-slate-800">⚡ Quick add</h2>
          <button onClick={onClose} className="rounded-lg px-2.5 py-1 text-lg leading-none text-slate-500 hover:bg-slate-100" aria-label="Close quick add">
            ✕
          </button>
        </div>
        <div className="mt-3 flex gap-1 border-b border-slate-200">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px flex-1 border-b-2 px-2 py-2 text-sm font-semibold ${
                tab === t.id ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div key={tab} className="mt-4">
          {tab === "task" && <TaskTab />}
          {tab === "expense" && <ExpenseTab />}
          {tab === "card" && <CardTab />}
        </div>
        <p className="mt-3 text-center text-xs text-slate-400">It stays open so you can add several. Press Esc to close.</p>
      </div>
    </div>,
    document.body
  );
}

// A floating "+" button (also opened with the N key) and a back-to-top button.
export default function FloatingActions() {
  const [open, setOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    function onScroll() {
      setShowTop(window.scrollY > 500);
    }
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.key.toLowerCase() !== "n") return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      e.preventDefault();
      setOpen(true);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <>
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-center gap-3">
        {showTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="pop-in h-11 w-11 rounded-full bg-white text-lg font-bold text-slate-600 shadow-lg ring-1 ring-slate-200"
            aria-label="Back to top"
            title="Back to top"
          >
            ↑
          </button>
        )}
        <button
          onClick={() => setOpen(true)}
          className="ring-pulse h-14 w-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-3xl font-light text-white shadow-xl"
          aria-label="Quick add (press N)"
          title="Quick add a task, expense or flashcard (press N)"
        >
          ＋
        </button>
      </div>
      {open && <QuickAddDialog initialTab="task" onClose={() => setOpen(false)} />}
    </>
  );
}
