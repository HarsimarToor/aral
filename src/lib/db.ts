import Dexie, { type Table } from "dexie";
import type {
  Allowance,
  Chain,
  ChainStep,
  CustomReward,
  Deck,
  Expense,
  Flashcard,
  GameRow,
  LedgerEntry,
  Purchase,
  Readiness,
  Setting,
  Subject,
  Task,
} from "@/types";

class StudyDB extends Dexie {
  subjects!: Table<Subject, number>;
  tasks!: Table<Task, number>;
  chains!: Table<Chain, number>;
  chainSteps!: Table<ChainStep, number>;
  game!: Table<GameRow, number>;
  ledger!: Table<LedgerEntry, string>;
  purchases!: Table<Purchase, number>;
  customRewards!: Table<CustomReward, number>;
  expenses!: Table<Expense, number>;
  allowance!: Table<Allowance, string>;
  decks!: Table<Deck, number>;
  flashcards!: Table<Flashcard, number>;
  readiness!: Table<Readiness, number>;
  settings!: Table<Setting, string>;

  constructor() {
    super("aral-study-db");
    // Only indexed fields are listed here. Other fields are still saved.
    this.version(1).stores({
      subjects: "++id, name",
      tasks: "++id, type, subjectId, priority, dueDate, done, chainId",
      chains: "++id, name, timeBlock",
      chainSteps: "++id, chainId, order, linkedTaskId",
      game: "id",
      ledger: "refId, source, createdAt",
      purchases: "++id, itemId, createdAt",
      customRewards: "++id, name",
      expenses: "++id, date, category",
      allowance: "weekStart",
      decks: "++id, subjectId",
      flashcards: "++id, deckId, subjectId, source",
      readiness: "subjectId",
    });
    // Version 2 adds a small key/value table (used to remember that the shop defaults were added).
    // Your existing data is kept.
    this.version(2).stores({
      settings: "key",
      customRewards: "++id, name, kind, slug",
    });
  }
}

// Safe to import anywhere, but only READ/WRITE it inside effects or event
// handlers (client side). IndexedDB does not exist during server rendering.
export const db = new StudyDB();
