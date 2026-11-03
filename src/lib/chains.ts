import { db } from "@/lib/db";
import { todayStr } from "@/lib/dates";
import { isTaskDone, toggleTask } from "@/lib/tasks";
import { MAX_SHIELDS, START_SHIELDS, chainXp, nextStreak } from "@/lib/chainLogic";
import { useGameStore } from "@/store/useGameStore";
import type { ChainStep, TimeBlock } from "@/types";

export interface StepInput {
  title: string;
  minutes: number;
  linkedTaskId?: number;
}

export interface ChainInput {
  name: string;
  timeBlock: TimeBlock;
  days: number[];
  steps: StepInput[];
}

/** Creates a chain (or replaces the steps of an existing one). Returns false if the input is not valid. */
export async function saveChain(input: ChainInput, existingId?: number): Promise<boolean> {
  const name = input.name.trim();
  const steps = input.steps
    .map((s) => ({
      title: s.title.trim(),
      minutes: Math.max(1, Math.round(s.minutes) || 1),
      linkedTaskId: s.linkedTaskId,
    }))
    .filter((s) => s.title);
  if (!name || steps.length === 0) return false;

  await db.transaction("rw", db.chains, db.chainSteps, async () => {
    let id: number;
    if (existingId === undefined) {
      id = await db.chains.add({
        name,
        timeBlock: input.timeBlock,
        days: input.days,
        streak: 0,
        shields: START_SHIELDS,
      });
    } else {
      id = existingId;
      await db.chains.update(id, { name, timeBlock: input.timeBlock, days: input.days });
      await db.chainSteps.where("chainId").equals(id).delete();
    }
    await db.chainSteps.bulkAdd(
      steps.map((s, i) => ({
        chainId: id,
        order: i,
        title: s.title,
        minutes: s.minutes,
        linkedTaskId: s.linkedTaskId,
      }))
    );
  });
  return true;
}

export async function deleteChain(id: number): Promise<void> {
  await db.transaction("rw", db.chains, db.chainSteps, async () => {
    await db.chainSteps.where("chainId").equals(id).delete();
    await db.chains.delete(id);
  });
}

/** Finishing a step ticks its linked task (if any), which also updates that subject's progress. */
export async function completeStep(step: ChainStep): Promise<void> {
  if (step.linkedTaskId === undefined) return;
  const task = await db.tasks.get(step.linkedTaskId);
  if (task && !isTaskDone(task)) await toggleTask(task);
}

export interface ChainResult {
  xp: number;
  coins: number;
  streak: number;
  shieldsUsed: number;
  earnedShield: boolean;
}

/** Marks the whole chain done for today: updates the streak and shields, and pays XP once per day. */
export async function completeChain(chainId: number): Promise<ChainResult | null> {
  const chain = await db.chains.get(chainId);
  if (!chain) return null;
  const today = todayStr();
  if (chain.lastCompletedDate === today) return null; // already counted today

  const { streak, shieldsUsed } = nextStreak(chain, today);
  let shields = chain.shields - shieldsUsed;
  let earnedShield = false;
  if (streak % 7 === 0 && shields < MAX_SHIELDS) {
    shields++;
    earnedShield = true;
  }
  await db.chains.update(chainId, { streak, shields, lastCompletedDate: today });

  const xp = chainXp(streak);
  const paid = useGameStore.getState().awardXp({ source: "chain", xp, refId: `chain:${chainId}:${today}` });
  return { xp, coins: paid?.coins ?? 0, streak, shieldsUsed, earnedShield };
}

/** The example routine from the project brief. */
export async function addStarterChain(): Promise<void> {
  await saveChain({
    name: "Nightly Reset",
    timeBlock: "night",
    days: [0, 1, 2, 3, 4, 5, 6],
    steps: [
      { title: "Review lecture notes for tomorrow", minutes: 10 },
      { title: "Clear top items from the assignment inbox", minutes: 5 },
      { title: "Set up tomorrow's study schedule", minutes: 5 },
    ],
  });
}
