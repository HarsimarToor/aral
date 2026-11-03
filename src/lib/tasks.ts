import { db } from "@/lib/db";
import { useGameStore } from "@/store/useGameStore";
import { notifyUndo } from "@/components/ui/RewardToast";
import { xpForTask } from "@/lib/game/levels";
import { daysUntil, todayStr, yesterdayStr } from "@/lib/dates";
import type { Priority, Task, TaskType } from "@/types";

export const SUBJECT_COLORS = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

/** To-dos use `done`. Dailies and habits are done when completed TODAY, so they reset by themselves each day. */
export function isTaskDone(task: Task, today = todayStr()): boolean {
  return task.type === "todo" ? task.done : task.lastCompletedDate === today;
}

export function isOverdue(task: Task): boolean {
  return task.type === "todo" && !task.done && !!task.dueDate && daysUntil(task.dueDate) < 0;
}

export function isDueToday(task: Task): boolean {
  return task.type === "todo" && !task.done && task.dueDate === todayStr();
}

// ---------- subjects ----------

export async function addSubject(name: string): Promise<void> {
  const clean = name.trim();
  if (!clean) return;
  const count = await db.subjects.count();
  await db.subjects.add({ name: clean, color: SUBJECT_COLORS[count % SUBJECT_COLORS.length] });
}

/** Removes a subject. Its tasks stay (they become "No subject"); its flashcards, decks and readiness are deleted. */
export async function deleteSubject(id: number): Promise<void> {
  await db.transaction("rw", [db.subjects, db.tasks, db.flashcards, db.decks, db.readiness], async () => {
    await db.tasks.where("subjectId").equals(id).modify({ subjectId: undefined });
    await db.flashcards.where("subjectId").equals(id).delete();
    await db.decks.where("subjectId").equals(id).delete();
    await db.readiness.delete(id);
    await db.subjects.delete(id);
  });
}

// ---------- tasks ----------

export interface TaskInput {
  title: string;
  type: TaskType;
  priority: Priority;
  dueDate?: string;
  subjectId?: number;
}

export async function addTask(input: TaskInput): Promise<void> {
  const title = input.title.trim();
  if (!title) return;
  await db.tasks.add({
    title,
    type: input.type,
    priority: input.priority,
    dueDate: input.dueDate || undefined,
    subjectId: input.subjectId,
    done: false,
    streak: 0,
    createdAt: new Date().toISOString(),
  });
}

export async function updateTask(id: number, input: TaskInput): Promise<void> {
  await db.tasks.update(id, {
    title: input.title.trim(),
    type: input.type,
    priority: input.priority,
    dueDate: input.dueDate || undefined,
    subjectId: input.subjectId,
  });
}

export async function deleteTask(id: number): Promise<void> {
  await db.tasks.delete(id);
}

/** Deletes a task and offers an Undo for a few seconds. */
export async function deleteTaskWithUndo(task: Task): Promise<void> {
  if (task.id === undefined) return;
  await db.tasks.delete(task.id);
  notifyUndo(`Deleted "${task.title}"`, () => {
    db.tasks.put(task);
  });
}

/** Check / un-check a task. Awards XP once, takes it back on un-check. */
export async function toggleTask(task: Task): Promise<void> {
  if (task.id === undefined) return;
  const id = task.id;
  const game = useGameStore.getState();
  const today = todayStr();

  if (task.type === "todo") {
    if (!task.done) {
      await db.tasks.update(id, { done: true, completedAt: new Date().toISOString() });
      game.awardXp({
        source: `todo:${task.priority}`,
        xp: xpForTask("todo", task.priority),
        refId: `task:${id}`,
      });
    } else {
      await db.tasks.update(id, { done: false, completedAt: undefined });
      game.revokeXp(`task:${id}`);
    }
    return;
  }

  // Daily or habit: pays once per day.
  const refId = `${task.type}:${id}:${today}`;
  if (task.lastCompletedDate === today) {
    const streak = Math.max(0, task.streak - 1);
    await db.tasks.update(id, {
      streak,
      lastCompletedDate: streak > 0 ? yesterdayStr() : undefined,
      completedAt: undefined,
    });
    game.revokeXp(refId);
  } else {
    const streak = task.lastCompletedDate === yesterdayStr() ? task.streak + 1 : 1;
    await db.tasks.update(id, {
      streak,
      lastCompletedDate: today,
      completedAt: new Date().toISOString(),
    });
    game.awardXp({ source: task.type, xp: xpForTask(task.type), refId });
  }
}
