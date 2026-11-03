// The starting items of the shop. On first run they are copied into the database
// (table "customRewards"), after which every one can be edited or deleted in the app.

export interface SeedItem {
  slug: string;
  kind: "reward" | "cosmetic";
  name: string;
  emoji: string;
  price: number;
}

export const DEFAULT_ITEMS: SeedItem[] = [
  // Rewards: can be redeemed again and again
  { slug: "reward:milk-tea", kind: "reward", name: "Milk tea", emoji: "🧋", price: 60 },
  { slug: "reward:one-hour-rest", kind: "reward", name: "One-hour rest", emoji: "😴", price: 30 },
  { slug: "reward:favorite-snack", kind: "reward", name: "Favorite snack", emoji: "🍿", price: 20 },
  { slug: "reward:movie-night", kind: "reward", name: "Movie night", emoji: "🎬", price: 120 },
  // Plant cosmetics: bought once, then shown as "Owned" and worn by the plant
  { slug: "cosmetic:straw-hat", kind: "cosmetic", name: "Straw hat", emoji: "👒", price: 40 },
  { slug: "cosmetic:sunglasses", kind: "cosmetic", name: "Sunglasses", emoji: "🕶️", price: 50 },
  { slug: "cosmetic:butterfly", kind: "cosmetic", name: "Butterfly", emoji: "🦋", price: 100 },
  { slug: "cosmetic:crown", kind: "cosmetic", name: "Crown", emoji: "👑", price: 200 },
];

export const REWARD_EMOJIS = ["🧋", "🍿", "🎬", "😴", "🎮", "🍕", "🍦", "☕", "🎧", "📚", "🛍️", "🎁"];
export const COSMETIC_EMOJIS = ["👒", "🕶️", "🦋", "👑", "🎀", "🌈", "⭐", "🐝", "🎩", "🧣"];
