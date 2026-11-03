"use client";

import { useState } from "react";
import { addTask, updateTask } from "@/lib/tasks";
import type { Priority, Subject, Task, TaskType } from "@/types";

const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm";

export default function TaskForm({
  subjects,
  editing,
  onDone,
}: {
  subjects: Subject[];
  editing: Task | null;
  onDone: () => void;
}) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [type, setType] = useState<TaskType>(editing?.type ?? "todo");
  const [priority, setPriority] = useState<Priority>(editing?.priority ?? "medium");
  const [dueDate, setDueDate] = useState(editing?.dueDate ?? "");
  const [subjectId, setSubjectId] = useState<string>(
    editing?.subjectId !== undefined ? String(editing.subjectId) : ""
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const input = {
      title,
      type,
      priority,
      dueDate: dueDate || undefined,
      subjectId: subjectId ? Number(subjectId) : undefined,
    };
    if (editing?.id !== undefined) await updateTask(editing.id, input);
    else await addTask(input);
    setTitle("");
    setDueDate("");
    onDone();
  }

  return (
    <form onSubmit={submit} className="rounded-xl bg-slate-50 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          className={`${field} sm:col-span-2 lg:col-span-5`}
          aria-label="Task title"
          required
        />
        <label className="text-xs font-medium text-slate-600">
          Type
          <select value={type} onChange={(e) => setType(e.target.value as TaskType)} className={field}>
            <option value="todo">To-do</option>
            <option value="daily">Daily</option>
            <option value="habit">Habit</option>
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">
          Priority
          <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className={field}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">
          Due date
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={field} />
        </label>
        <label className="text-xs font-medium text-slate-600">
          Subject
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={field}>
            <option value="">No subject</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700">
            {editing ? "Save" : "Add task"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={onDone}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
