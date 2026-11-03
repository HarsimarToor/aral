"use client";

import { useMemo, useState } from "react";
import { deleteTaskWithUndo, isDueToday, isOverdue, isTaskDone, toggleTask } from "@/lib/tasks";
import { daysUntil, formatDue, todayStr } from "@/lib/dates";
import type { Priority, Subject, Task, TaskType } from "@/types";

const PRIORITY_STYLE: Record<Priority, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};
const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
const TYPE_LABEL: Record<TaskType, string> = { todo: "To-do", daily: "Daily", habit: "Habit" };

const select = "rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm";

export default function TaskList({
  tasks,
  subjects,
  onEdit,
}: {
  tasks: Task[];
  subjects: Subject[];
  onEdit: (t: Task) => void;
}) {
  const [status, setStatus] = useState<"all" | "pending" | "completed">("all");
  const [type, setType] = useState<"all" | TaskType>("all");
  const [priority, setPriority] = useState<"all" | Priority>("all");
  const [subject, setSubject] = useState("all");
  const [due, setDue] = useState<"all" | "overdue" | "today" | "week">("all");
  const [query, setQuery] = useState("");

  const today = todayStr();
  const subjectById = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);

  // One-click filter chips (they set the same filters as the drop-downs below).
  type Chip = "all" | "today" | "overdue" | "week" | "completed";
  const counts = {
    today: tasks.filter(isDueToday).length,
    overdue: tasks.filter(isOverdue).length,
    completed: tasks.filter((t) => isTaskDone(t, today)).length,
  };
  const noExtra = type === "all" && priority === "all" && subject === "all" && query === "";
  const activeChip: Chip | null =
    due === "today" ? "today"
    : due === "overdue" ? "overdue"
    : due === "week" ? "week"
    : status === "completed" && due === "all" ? "completed"
    : status === "all" && due === "all" && noExtra ? "all"
    : null;
  const hasFilters = status !== "all" || due !== "all" || !noExtra;

  function applyChip(c: Chip) {
    setQuery("");
    setType("all");
    setPriority("all");
    setSubject("all");
    setStatus(c === "completed" ? "completed" : c === "all" ? "all" : "pending");
    setDue(c === "today" || c === "overdue" || c === "week" ? c : "all");
  }

  const chips: { id: Chip; label: string; count?: number }[] = [
    { id: "all", label: "All" },
    { id: "today", label: "Due today", count: counts.today },
    { id: "overdue", label: "Overdue", count: counts.overdue },
    { id: "week", label: "Next 7 days" },
    { id: "completed", label: "Completed", count: counts.completed },
  ];

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks
      .filter((t) => {
        const done = isTaskDone(t, today);
        if (status === "pending" && done) return false;
        if (status === "completed" && !done) return false;
        if (type !== "all" && t.type !== type) return false;
        if (priority !== "all" && t.priority !== priority) return false;
        if (subject === "none" && t.subjectId !== undefined) return false;
        if (subject !== "all" && subject !== "none" && String(t.subjectId) !== subject) return false;
        if (due === "overdue" && !isOverdue(t)) return false;
        if (due === "today" && !isDueToday(t)) return false;
        if (due === "week") {
          if (!t.dueDate || done) return false;
          const n = daysUntil(t.dueDate);
          if (n < 0 || n > 7) return false;
        }
        if (q && !t.title.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        const da = isTaskDone(a, today) ? 1 : 0;
        const db_ = isTaskDone(b, today) ? 1 : 0;
        if (da !== db_) return da - db_;
        const dueA = a.dueDate ?? "9999-12-31";
        const dueB = b.dueDate ?? "9999-12-31";
        if (dueA !== dueB) return dueA < dueB ? -1 : 1;
        return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      });
  }, [tasks, status, type, priority, subject, due, query, today]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2" aria-label="Quick filters">
        {chips.map((c) => (
          <button
            key={c.id}
            onClick={() => applyChip(c.id)}
            aria-pressed={activeChip === c.id}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${
              activeChip === c.id
                ? c.id === "overdue"
                  ? "bg-red-500 text-white"
                  : "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {c.label}
            {c.count !== undefined && c.count > 0 && (
              <span className={`ml-1.5 rounded-full px-1.5 text-xs ${activeChip === c.id ? "bg-white/25" : "bg-white text-slate-500"}`}>
                {c.count}
              </span>
            )}
          </button>
        ))}
        {hasFilters && (
          <button onClick={() => applyChip("all")} className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-500 underline-offset-2 hover:text-emerald-700 hover:underline">
            Clear filters
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tasks"
          className={`${select} min-w-[140px] flex-1`}
          aria-label="Search tasks"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={select} aria-label="Status">
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>
        <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className={select} aria-label="Type">
          <option value="all">All types</option>
          <option value="todo">To-dos</option>
          <option value="daily">Dailies</option>
          <option value="habit">Habits</option>
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} className={select} aria-label="Priority">
          <option value="all">Any priority</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select value={subject} onChange={(e) => setSubject(e.target.value)} className={select} aria-label="Subject">
          <option value="all">All subjects</option>
          <option value="none">No subject</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select value={due} onChange={(e) => setDue(e.target.value as typeof due)} className={select} aria-label="Due date">
          <option value="all">Any due date</option>
          <option value="overdue">Overdue</option>
          <option value="today">Due today</option>
          <option value="week">Next 7 days</option>
        </select>
      </div>

      {visible.length === 0 ? (
        <div className="mt-6 rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
          <div className="bob text-5xl" aria-hidden>
            {tasks.length === 0 ? "📝" : "🔍"}
          </div>
          <p className="mt-2 font-semibold text-slate-700">
            {tasks.length === 0 ? "No tasks yet" : "Nothing matches these filters"}
          </p>
          <p className="text-sm text-slate-500">
            {tasks.length === 0
              ? "Add your first habit, daily or to-do in the form above."
              : "Try clearing a filter or the search box."}
          </p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {visible.map((t) => {
            const done = isTaskDone(t, today);
            const s = subjectById.get(t.subjectId);
            const overdue = isOverdue(t);
            return (
              <li key={t.id} className="flex items-center gap-3 py-2.5">
                <button
                  onClick={() => toggleTask(t)}
                  aria-label={done ? `Mark "${t.title}" as not done` : `Mark "${t.title}" as done`}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-sm font-bold ${
                    done ? "pop border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 hover:border-emerald-400"
                  }`}
                >
                  {done ? "✓" : ""}
                </button>

                <div className="min-w-0 flex-1">
                  <div className={`truncate text-sm font-medium ${done ? "text-slate-400 line-through" : "text-slate-800"}`}>
                    {t.title}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">{TYPE_LABEL[t.type]}</span>
                    <span className={`rounded px-1.5 py-0.5 ${PRIORITY_STYLE[t.priority]}`}>{t.priority}</span>
                    {s && (
                      <span className="rounded px-1.5 py-0.5 text-white" style={{ backgroundColor: s.color }}>
                        {s.name}
                      </span>
                    )}
                    {t.dueDate && !done && (
                      <span className={overdue ? "font-semibold text-red-600" : "text-slate-500"}>{formatDue(t.dueDate)}</span>
                    )}
                    {t.type !== "todo" && t.streak > 0 && (
                      <span className="font-semibold text-orange-600">🔥 {t.streak}-day streak</span>
                    )}
                  </div>
                </div>

                <button onClick={() => onEdit(t)} className="text-xs text-slate-500 hover:text-emerald-700">
                  Edit
                </button>
                <button
                  onClick={() => deleteTaskWithUndo(t)}
                  className="text-xs text-slate-400 hover:text-red-600"
                  aria-label={`Delete ${t.title}`}
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
