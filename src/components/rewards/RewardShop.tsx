"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useGameStore } from "@/store/useGameStore";
import { deleteShopItem, ensureShopSeeded, itemKey, restoreDefaults, saveShopItem } from "@/lib/shop";
import { COSMETIC_EMOJIS, REWARD_EMOJIS } from "@/data/shopItems";
import { confirmDialog } from "@/components/ui/ConfirmHost";
import { notifyReward, notifyUndo } from "@/components/ui/RewardToast";
import { fireConfetti } from "@/components/ui/Confetti";
import type { CustomReward } from "@/types";

type Kind = "reward" | "cosmetic";

// ---------- Add / edit dialog ----------

function ItemEditor({ kind, initial, onClose }: { kind: Kind; initial: CustomReward | null; onClose: () => void }) {
  const [emoji, setEmoji] = useState(initial?.emoji ?? (kind === "cosmetic" ? "👒" : "🎁"));
  const [name, setName] = useState(initial?.name ?? "");
  const [price, setPrice] = useState(initial ? String(initial.price) : "");
  const [error, setError] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await saveShopItem({ name, emoji, price: Number(price), kind }, initial?.id);
    if (!ok) {
      setError("Please enter a name and a price of at least 1 coin.");
      return;
    }
    notifyReward(initial ? "Reward updated" : "Reward added", "✅");
    onClose();
  }

  const presets = kind === "cosmetic" ? COSMETIC_EMOJIS : REWARD_EMOJIS;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={initial ? "Edit item" : "Add item"}
      onClick={onClose}
    >
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="pop-in w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <div className="text-center">
          <div className="text-6xl" aria-hidden>
            {emoji || "🎁"}
          </div>
          <h2 className="mt-1 text-lg font-extrabold text-slate-800">
            {initial ? "Edit" : "Add"} {kind === "cosmetic" ? "plant cosmetic" : "reward"}
          </h2>
        </div>

        <div className="mt-3 flex flex-wrap justify-center gap-1.5" aria-label="Pick an emoji">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setEmoji(p)}
              className={`h-9 w-9 rounded-xl text-xl ${emoji === p ? "bg-emerald-100 ring-2 ring-emerald-400" : "bg-slate-100 hover:bg-slate-200"}`}
              aria-label={`Use ${p}`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-[4.5rem_1fr] gap-3">
          <label className="text-xs font-medium text-slate-600">
            Emoji
            <input
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              maxLength={4}
              className="mt-0.5 block w-full rounded-lg border border-slate-300 px-2 py-1.5 text-center text-lg"
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={kind === "cosmetic" ? "e.g. Party hat" : "e.g. Gaming hour"}
              autoFocus
              className="mt-0.5 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <label className="mt-3 block text-xs font-medium text-slate-600">
          Price in coins
          <input
            type="number"
            min={1}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-0.5 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        {error && <p className="shake-once mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white">{initial ? "Save changes" : "Add"}</button>
        </div>
      </form>
    </div>,
    document.body
  );
}

// ---------- One item ----------

function ItemCard({
  item,
  coins,
  owned,
  redeemed,
  onBuy,
  onEdit,
  onDelete,
}: {
  item: CustomReward;
  coins: number;
  owned: boolean;
  redeemed: number;
  onBuy: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cosmetic = item.kind === "cosmetic";
  const missing = item.price - coins;
  const progress = Math.min(100, Math.round((coins / item.price) * 100));

  return (
    <li className="lift group rounded-2xl border border-slate-200 bg-white p-3">
      <div className="flex items-start gap-3">
        <span className="text-4xl transition-transform duration-200 group-hover:scale-125 group-hover:-rotate-6" aria-hidden>
          {item.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-slate-800">{item.name}</div>
          <div className="text-xs font-semibold text-amber-700">🪙 {item.price}</div>
          {!cosmetic && redeemed > 0 && <div className="text-xs text-slate-400">Redeemed {redeemed}×</div>}
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={onEdit}
            className="rounded-lg bg-slate-100 px-2 py-1 text-xs hover:bg-emerald-100"
            aria-label={`Edit ${item.name}`}
            title="Edit"
          >
            ✏️
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg bg-slate-100 px-2 py-1 text-xs hover:bg-red-100"
            aria-label={`Delete ${item.name}`}
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="mt-3">
        {owned ? (
          <div className="rounded-xl bg-emerald-100 py-1.5 text-center text-sm font-bold text-emerald-700">✓ Owned</div>
        ) : missing > 0 ? (
          <div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-amber-400 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <button disabled className="mt-1.5 w-full rounded-xl bg-slate-100 py-1.5 text-sm font-medium text-slate-400">
              Need {missing} more
            </button>
          </div>
        ) : (
          <button onClick={onBuy} className="w-full rounded-xl bg-emerald-600 py-1.5 text-sm font-bold text-white">
            {cosmetic ? "Buy" : "Redeem"}
          </button>
        )}
      </div>
    </li>
  );
}

// ---------- The shop ----------

export default function RewardShop() {
  const coins = useGameStore((s) => s.coins);
  const owned = useGameStore((s) => s.owned);
  const spendCoins = useGameStore((s) => s.spendCoins);
  const addOwned = useGameStore((s) => s.addOwned);

  const items = useLiveQuery(() => db.customRewards.toArray(), []);
  const purchases = useLiveQuery(() => db.purchases.toArray(), []);
  const [editor, setEditor] = useState<{ kind: Kind; item: CustomReward | null } | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    ensureShopSeeded();
  }, []);

  const redeemedCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of purchases ?? []) map.set(p.itemId, (map.get(p.itemId) ?? 0) + 1);
    return map;
  }, [purchases]);

  if (!items) {
    return (
      <section className="section-card accent-rose">
        <h2 className="text-lg font-bold text-slate-800">🛍️ Reward shop</h2>
        <p className="mt-2 text-sm text-slate-500">Loading...</p>
      </section>
    );
  }

  const sorted = [...items].sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  const rewards = sorted.filter((i) => i.kind !== "cosmetic");
  const cosmetics = sorted.filter((i) => i.kind === "cosmetic");

  async function buy(item: CustomReward) {
    if (!spendCoins(item.price)) return; // not enough coins: nothing is deducted
    const key = itemKey(item);
    await db.purchases.add({ itemId: key, price: item.price, createdAt: new Date().toISOString() });
    if (item.kind === "cosmetic") {
      addOwned(key);
      fireConfetti();
      setNotice(`${item.emoji} ${item.name} is now on your plant!`);
    } else {
      setNotice(`${item.emoji} Enjoy your ${item.name.toLowerCase()}! -${item.price} coins`);
    }
    notifyReward(`-${item.price} coins · ${item.name}`, item.emoji);
  }

  async function remove(item: CustomReward) {
    if (item.id === undefined) return;
    const saved = item;
    const ok = await confirmDialog({
      title: `Delete "${item.name}"?`,
      message: item.kind === "cosmetic" ? "If you own it, it also disappears from your plant." : "You can press Undo right after.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    await deleteShopItem(item.id);
    notifyUndo(`Deleted "${saved.name}"`, () => {
      db.customRewards.put(saved);
    });
  }

  async function restore() {
    const n = await restoreDefaults();
    notifyReward(n > 0 ? `Restored ${n} default item${n === 1 ? "" : "s"}` : "All default items are already here", "↺");
  }

  return (
    <section className="section-card accent-rose">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-800">🛍️ Reward shop</h2>
          <p className="text-sm text-slate-500">Spend your coins. You can edit or delete every item, or add your own.</p>
        </div>
        <span className="rounded-full bg-gradient-to-r from-amber-100 to-yellow-100 px-4 py-1.5 text-base font-extrabold text-amber-800">
          🪙 <span key={coins} className="pop inline-block">{coins}</span>
        </span>
      </div>
      <p className="mt-1 min-h-5 text-sm font-medium text-emerald-700" aria-live="polite">
        {notice}
      </p>

      <div className="mt-2 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Rewards</h3>
        <button
          onClick={() => setEditor({ kind: "reward", item: null })}
          className="rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white"
        >
          ＋ Add reward
        </button>
      </div>
      {rewards.length === 0 ? (
        <div className="mt-2 rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
          No rewards yet. Add one, or restore the defaults below.
        </div>
      ) : (
        <ul className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rewards.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              coins={coins}
              owned={false}
              redeemed={redeemedCount.get(itemKey(item)) ?? 0}
              onBuy={() => buy(item)}
              onEdit={() => setEditor({ kind: "reward", item })}
              onDelete={() => remove(item)}
            />
          ))}
        </ul>
      )}

      <div className="mt-6 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Plant cosmetics</h3>
        <button
          onClick={() => setEditor({ kind: "cosmetic", item: null })}
          className="rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white"
        >
          ＋ Add cosmetic
        </button>
      </div>
      {cosmetics.length === 0 ? (
        <div className="mt-2 rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
          No cosmetics yet. Add one, or restore the defaults below.
        </div>
      ) : (
        <ul className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cosmetics.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              coins={coins}
              owned={owned.includes(itemKey(item))}
              redeemed={0}
              onBuy={() => buy(item)}
              onEdit={() => setEditor({ kind: "cosmetic", item })}
              onDelete={() => remove(item)}
            />
          ))}
        </ul>
      )}

      <div className="mt-6 text-center">
        <button onClick={restore} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 ring-1 ring-slate-200 hover:text-emerald-700">
          ↺ Restore deleted default items
        </button>
      </div>

      {editor && <ItemEditor key={editor.item?.id ?? editor.kind} kind={editor.kind} initial={editor.item} onClose={() => setEditor(null)} />}
    </section>
  );
}
