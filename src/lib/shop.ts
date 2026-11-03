import { db } from "@/lib/db";
import { DEFAULT_ITEMS } from "@/data/shopItems";
import type { CustomReward } from "@/types";

/** The id used in `owned` and `purchases`. Built-in items keep their old slug so earlier purchases still count. */
export function itemKey(item: CustomReward): string {
  if (item.slug) return item.slug;
  return `${item.kind === "cosmetic" ? "cosmetic" : "reward"}:${item.id}`;
}

let seeding: Promise<void> | null = null;

/**
 * Copies the default rewards and cosmetics into the database ONE time (it remembers that it did),
 * so afterwards every item can be edited or deleted and deleted ones do not come back by themselves.
 */
export function ensureShopSeeded(): Promise<void> {
  if (seeding) return seeding;
  const run: Promise<void> = db
    .transaction("rw", db.settings, db.customRewards, async () => {
      if (await db.settings.get("shopSeeded")) return;
      await db.customRewards.bulkAdd(
        DEFAULT_ITEMS.map((i) => ({ name: i.name, emoji: i.emoji, price: i.price, kind: i.kind, slug: i.slug }))
      );
      await db.settings.put({ key: "shopSeeded", value: true });
    })
    .then(() => undefined)
    .catch(() => {
      seeding = null; // try again next time
    });
  seeding = run;
  return run;
}

/** Adds back any built-in item that was deleted. Items that still exist (even edited) are left alone. */
export async function restoreDefaults(): Promise<number> {
  const existing = await db.customRewards.toArray();
  const have = new Set(existing.map((r) => r.slug).filter(Boolean));
  const missing = DEFAULT_ITEMS.filter((i) => !have.has(i.slug));
  if (missing.length > 0) {
    await db.customRewards.bulkAdd(
      missing.map((i) => ({ name: i.name, emoji: i.emoji, price: i.price, kind: i.kind, slug: i.slug }))
    );
  }
  return missing.length;
}

export interface ShopItemInput {
  name: string;
  emoji: string;
  price: number;
  kind: "reward" | "cosmetic";
}

/** Creates a new item, or updates the one with `id`. Returns false if the input is not valid. */
export async function saveShopItem(input: ShopItemInput, id?: number): Promise<boolean> {
  const name = input.name.trim();
  const price = Math.floor(input.price);
  if (!name || !price || price < 1) return false;
  const emoji = input.emoji.trim() || (input.kind === "cosmetic" ? "✨" : "🎁");
  if (id === undefined) await db.customRewards.add({ name, emoji, price, kind: input.kind });
  else await db.customRewards.update(id, { name, emoji, price });
  return true;
}

export async function deleteShopItem(id: number): Promise<void> {
  await db.customRewards.delete(id);
}
