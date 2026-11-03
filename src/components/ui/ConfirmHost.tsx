"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  /** Red confirm button (default true, because this is used for deletes). */
  danger?: boolean;
}

interface Request extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

let handler: ((r: Request) => void) | null = null;

/** A friendly replacement for window.confirm. Usage: if (await confirmDialog({ title: "Delete it?" })) { ... } */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!handler) {
      resolve(typeof window !== "undefined" ? window.confirm(options.title) : false);
      return;
    }
    handler({ ...options, resolve });
  });
}

// Mounted once (inside GameBoot).
export default function ConfirmHost() {
  const [req, setReq] = useState<Request | null>(null);

  useEffect(() => {
    handler = (r) => {
      setReq((previous) => {
        previous?.resolve(false); // a newer question replaces an unanswered one
        return r;
      });
    };
    return () => {
      handler = null;
    };
  }, []);

  const close = useCallback(
    (ok: boolean) => {
      req?.resolve(ok);
      setReq(null);
    },
    [req]
  );

  useEffect(() => {
    if (!req) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [req, close]);

  if (!req) return null;
  const danger = req.danger !== false;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-label={req.title}
      onClick={() => close(false)}
    >
      <div className="pop-in w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="text-5xl" aria-hidden>
          {danger ? "🗑️" : "❓"}
        </div>
        <h2 className="mt-2 text-lg font-extrabold text-slate-800">{req.title}</h2>
        {req.message && <p className="mt-1 text-sm text-slate-500">{req.message}</p>}
        <div className="mt-5 flex justify-center gap-3">
          <button
            onClick={() => close(false)}
            autoFocus
            className="rounded-xl bg-slate-100 px-5 py-2 font-semibold text-slate-700 hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={() => close(true)}
            className={`rounded-xl px-5 py-2 font-bold text-white ${danger ? "bg-red-600" : "bg-emerald-600"}`}
          >
            {req.confirmLabel ?? (danger ? "Delete" : "Yes")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
