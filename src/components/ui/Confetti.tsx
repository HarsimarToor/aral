"use client";

import { useEffect, useState } from "react";

const EVENT = "aral:confetti";
const COLORS = ["#10b981", "#f59e0b", "#3b82f6", "#ec4899", "#8b5cf6", "#ef4444", "#14b8a6"];
const COUNT = 70;

/** Call from anywhere in the browser to rain confetti, e.g. when a boss is defeated. */
export function fireConfetti() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT));
}

interface Piece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  round: boolean;
}

let nextId = 0;

// Mounted once (inside GameBoot).
export default function ConfettiHost() {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    function fire() {
      const start = nextId;
      nextId += COUNT;
      const made: Piece[] = Array.from({ length: COUNT }, (_, i) => ({
        id: start + i,
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        duration: 1.8 + Math.random() * 1.4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 6 + Math.random() * 8,
        round: Math.random() > 0.5,
      }));
      setPieces((p) => [...p, ...made]);
      window.setTimeout(() => setPieces((p) => p.filter((x) => x.id < start || x.id >= start + COUNT)), 3800);
    }
    window.addEventListener(EVENT, fire);
    return () => window.removeEventListener(EVENT, fire);
  }, []);

  return (
    <>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          aria-hidden
          style={{
            left: `${p.left}vw`,
            width: p.size,
            height: p.round ? p.size : p.size * 1.6,
            background: p.color,
            borderRadius: p.round ? "50%" : "2px",
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </>
  );
}
