"use client";

import { useEffect } from "react";

// Makes the page feel alive under the cursor (no visible UI of its own):
//  - cards get a soft spotlight that follows the pointer
//  - buttons lean a few pixels toward the pointer ("magnetic" buttons)
export default function PointerFx() {
  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (e.pointerType === "touch" || !(e.target instanceof Element)) return;

      const card = e.target.closest<HTMLElement>(".section-card, .lift");
      if (card) {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      }

      const btn = e.target.closest<HTMLButtonElement>("button:not(:disabled)");
      if (btn) {
        const r = btn.getBoundingClientRect();
        const dx = ((e.clientX - (r.left + r.width / 2)) / r.width) * 10;
        const dy = ((e.clientY - (r.top + r.height / 2)) / r.height) * 6;
        btn.style.setProperty("--tx", `${Math.max(-5, Math.min(5, dx)).toFixed(1)}px`);
        btn.style.setProperty("--ty", `${Math.max(-3, Math.min(3, dy)).toFixed(1)}px`);
      }
    }

    function onOut(e: PointerEvent) {
      if (!(e.target instanceof Element)) return;
      const btn = e.target.closest<HTMLButtonElement>("button");
      if (btn) {
        btn.style.removeProperty("--tx");
        btn.style.removeProperty("--ty");
      }
    }

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onOut, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onOut);
    };
  }, []);

  return null;
}
