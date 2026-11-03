"use client";

import { useRef, useState } from "react";
import { addGeneratedCards } from "@/lib/learning";
import { chunkText } from "@/lib/chunk";
import { extractPdfText } from "@/lib/pdfText";
import { fireConfetti } from "@/components/ui/Confetti";

const MAX_CHUNKS = 12; // about 70,000 characters per PDF
const CHUNK_SIZE = 6000;
const MAX_MB = 25;

interface Draft {
  key: number;
  front: string;
  back: string;
  keep: boolean;
}

const area = "block w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm";

function sizeLabel(bytes: number): string {
  return bytes > 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`;
}

function Stepper({ step }: { step: 1 | 2 | 3 | 4 }) {
  const labels = ["Choose PDF", "Read it", "Make cards", "Review & save"];
  return (
    <ol className="flex items-center gap-1 text-xs sm:gap-2" aria-label="Progress">
      {labels.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const current = n === step;
        return (
          <li key={label} className="flex min-w-0 flex-1 items-center gap-1.5">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-bold transition-colors ${
                done ? "bg-emerald-500 text-white" : current ? "bg-emerald-100 text-emerald-700 ring-pulse" : "bg-slate-100 text-slate-400"
              }`}
            >
              {done ? "✓" : n}
            </span>
            <span className={`hidden truncate sm:inline ${current ? "font-semibold text-slate-800" : "text-slate-400"}`}>{label}</span>
            {n < 4 && <span className={`h-0.5 flex-1 rounded ${done ? "bg-emerald-400" : "bg-slate-200"}`} />}
          </li>
        );
      })}
    </ol>
  );
}

export default function PdfFlashcardGenerator({
  subjectId,
  subjectName,
  onSaved,
}: {
  subjectId: number;
  subjectName: string;
  onSaved?: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<"idle" | "reading" | "generating">("idle");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [saved, setSaved] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const busy = phase !== "idle";
  const step: 1 | 2 | 3 | 4 = drafts.length > 0 && !busy ? 4 : phase === "reading" ? 2 : phase === "generating" ? 3 : 1;

  function pick(f: File | null | undefined) {
    setSaved("");
    setError("");
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("That is not a PDF. Please choose a file that ends in .pdf");
      return;
    }
    if (f.size > MAX_MB * 1_000_000) {
      setError(`That PDF is bigger than ${MAX_MB} MB. Try a smaller one or split it.`);
      return;
    }
    setFile(f);
    setDrafts([]);
  }

  async function generate() {
    if (!file) return;
    setPhase("reading");
    setProgress(0);
    setError("");
    setSaved("");
    setDrafts([]);

    try {
      setStatus("Reading the PDF...");
      const { text, pages } = await extractPdfText(file, (n, total) => {
        setStatus(`Reading page ${n} of ${total}...`);
        setProgress(Math.round((n / total) * 30));
      });

      if (text.replace(/\s/g, "").length < 100) {
        setStatus("");
        setError(
          "No readable text found. This PDF may be scanned images. Try a text-based PDF (one where you can select the text)."
        );
        return;
      }

      let chunks = chunkText(text, CHUNK_SIZE);
      const trimmed = chunks.length > MAX_CHUNKS;
      if (trimmed) chunks = chunks.slice(0, MAX_CHUNKS);

      setPhase("generating");
      const seen = new Set<string>();
      let counter = 0;
      let failed = "";

      for (let i = 0; i < chunks.length; i++) {
        setStatus(`Writing flashcards (part ${i + 1} of ${chunks.length}) from ${pages} page${pages === 1 ? "" : "s"}...`);
        setProgress(30 + Math.round((i / chunks.length) * 70));
        try {
          const res = await fetch("/api/flashcards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: chunks[i], subject: subjectName }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "Request failed.");

          const fresh: Draft[] = [];
          for (const c of data.cards as { front: string; back: string }[]) {
            const id = c.front.toLowerCase();
            if (seen.has(id)) continue;
            seen.add(id);
            fresh.push({ key: counter++, front: c.front, back: c.back, keep: true });
          }
          setDrafts((d) => [...d, ...fresh]);
        } catch (e) {
          failed = e instanceof Error ? e.message : "Request failed.";
          break; // keep the cards made so far
        }
      }

      setProgress(100);
      if (failed) {
        setError(
          navigator.onLine
            ? `Stopped early: ${failed}`
            : "You are offline. Making flashcards from a PDF needs internet. Your saved cards still work offline."
        );
        setStatus("");
      } else {
        setStatus(trimmed ? `Done. Only the first ${MAX_CHUNKS} parts of a long PDF were used.` : "Done! Check the cards below.");
      }
    } catch (e) {
      setStatus("");
      setError(
        e instanceof Error && /worker/i.test(e.message)
          ? "The PDF reader file is missing. Run: node scripts/copy-pdf-worker.mjs and then refresh the page."
          : `Could not read that PDF: ${e instanceof Error ? e.message : "unknown error"}`
      );
    } finally {
      setPhase("idle");
    }
  }

  function edit(key: number, patch: Partial<Draft>) {
    setDrafts((d) => d.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  }

  async function save() {
    if (!file) return;
    const kept = drafts.filter((d) => d.keep);
    const n = await addGeneratedCards(subjectId, file.name, kept);
    setDrafts([]);
    setFile(null);
    setStatus("");
    setProgress(0);
    setSaved(`Saved ${n} flashcards to ${subjectName}!`);
    fireConfetti();
    window.setTimeout(() => onSaved?.(), 1400);
  }

  const keptCount = drafts.filter((d) => d.keep).length;

  return (
    <div className="space-y-4">
      <Stepper step={step} />

      <div className="rounded-2xl bg-slate-50 p-4">
        <p className="text-xs text-slate-500">
          Your notes are read on this device, then sent to Gemini to write question-and-answer cards for{" "}
          <span className="font-semibold">{subjectName}</span>. This step needs internet. You can edit or remove any card
          before saving.
        </p>

        {/* The whole box is one big "press here to upload" button. */}
        <label
          htmlFor="pdf-input"
          className="dropzone mt-3"
          data-empty={!file && !busy}
          data-drag={dragging}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!busy) pick(e.dataTransfer.files?.[0]);
          }}
        >
          <input
            id="pdf-input"
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            disabled={busy}
            className="sr-only"
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = ""; // lets you pick the same file again
            }}
          />
          <span className="dropzone-icon text-5xl" aria-hidden>
            {file ? "✅" : dragging ? "📥" : "📄"}
          </span>
          {file ? (
            <>
              <span className="max-w-full truncate text-base font-bold text-slate-800">{file.name}</span>
              <span className="text-xs text-slate-500">{sizeLabel(file.size)} · press here to choose a different PDF</span>
            </>
          ) : (
            <>
              <span className="text-lg font-bold text-slate-800">Press here to upload your PDF</span>
              <span className="text-sm text-slate-500">or drag and drop it onto this box</span>
              <span className="text-xs text-slate-400">Text-based PDFs work best · up to {MAX_MB} MB</span>
            </>
          )}
        </label>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={generate}
            disabled={!file || busy}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white disabled:bg-slate-300"
          >
            {busy ? "Working..." : "✨ Generate flashcards"}
          </button>
          {!file && !busy && <span className="text-xs text-slate-400">Choose a PDF first</span>}
        </div>

        {(busy || progress > 0) && (
          <div className="mt-3" aria-live="polite">
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-sm text-slate-600">{status}</p>
          </div>
        )}
        {!busy && progress === 0 && status && <p className="mt-2 text-sm text-slate-600">{status}</p>}
        {error && (
          <p className="shake-once mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">
            {error}
          </p>
        )}
        {saved && (
          <p className="pop-in mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
            🎉 {saved} Taking you to your flashcards...
          </p>
        )}
      </div>

      {drafts.length > 0 && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-700">
              Review generated cards ({keptCount} of {drafts.length} selected)
            </h3>
            <button
              onClick={save}
              disabled={busy || keptCount === 0}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300"
            >
              💾 Save {keptCount} cards
            </button>
          </div>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {drafts.map((d) => (
              <li
                key={d.key}
                className={`pop-in rounded-xl border bg-white p-3 transition-opacity ${d.keep ? "border-slate-200" : "border-slate-100 opacity-50"}`}
              >
                <textarea
                  value={d.front}
                  onChange={(e) => edit(d.key, { front: e.target.value })}
                  rows={2}
                  className={area}
                  aria-label="Front of card"
                />
                <textarea
                  value={d.back}
                  onChange={(e) => edit(d.key, { back: e.target.value })}
                  rows={3}
                  className={`${area} mt-2`}
                  aria-label="Back of card"
                />
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-slate-500">
                  <input type="checkbox" checked={d.keep} onChange={(e) => edit(d.key, { keep: e.target.checked })} />
                  Keep this card
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
