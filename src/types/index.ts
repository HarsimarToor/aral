import type { PlantStage, Priority, TaskType } from "@/lib/game/levels";

export type { Priority, TaskType, PlantStage };

export interface Subject {
  id?: number;
  name: string;
  color: string;
}

export interface Task {
  id?: number;
  title: string;
  type: TaskType;
  subjectId?: number;
  priority: Priority;
  dueDate?: string; // YYYY-MM-DD
  done: boolean;
  completedAt?: string; // ISO date-time
  lastCompletedDate?: string; // YYYY-MM-DD (dailies / habits)
  streak: number;
  chainId?: number;
  createdAt: string;
}

export type TimeBlock = "morning" | "afternoon" | "evening" | "night" | "anytime";

export interface Chain {
  id?: number;
  name: string;
  timeBlock: TimeBlock;
  days: number[]; // 0 = Sunday ... 6 = Saturday
  streak: number;
  shields: number;
  lastCompletedDate?: string;
}

export interface ChainStep {
  id?: number;
  chainId: number;
  order: number;
  title: string;
  minutes: number;
  linkedTaskId?: number;
}

export interface GameRow {
  id: number; // always 1
  xp: number;
  coins: number;
  level: number;
  plantStage: PlantStage;
  health: number; // 0 - 100
  owned: string[]; // cosmetic ids
}

export interface LedgerEntry {
  refId: string;
  source: string;
  xp: number;
  coins: number;
  createdAt: string;
}

export interface Purchase {
  id?: number;
  itemId: string;
  price: number;
  createdAt: string;
}

/** A shop item. The default rewards and plant cosmetics are stored here too, so every one can be edited or deleted. */
export interface CustomReward {
  id?: number;
  name: string;
  emoji: string;
  price: number;
  /** "reward" can be redeemed again and again. "cosmetic" is bought once for the plant. Missing = "reward". */
  kind?: "reward" | "cosmetic";
  /** Stable id of a built-in item (e.g. "reward:milk-tea"), used to restore the defaults. */
  slug?: string;
}

export interface Setting {
  key: string;
  value: unknown;
}

export type ExpenseCategory = "transit" | "food" | "school" | "other";

export interface Expense {
  id?: number;
  date: string; // YYYY-MM-DD
  category: ExpenseCategory;
  note: string;
  amount: number;
}

export interface Allowance {
  weekStart: string; // YYYY-MM-DD (Monday), primary key
  amount: number;
  savingsTarget: number;
  limitWarn: number; // warn when this % of the allowance is spent
}

export interface Deck {
  id?: number;
  subjectId?: number;
  title: string;
  sourcePdfName?: string;
}

export interface Flashcard {
  id?: number;
  deckId: number;
  subjectId?: number;
  front: string;
  back: string;
  source: "ai" | "manual";
  timesCorrect: number;
  timesWrong: number;
  lastReviewed?: string;
}

export interface Readiness {
  subjectId: number; // primary key
  score: number; // 0 - 100
  updatedAt: string;
}
