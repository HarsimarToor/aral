/** Splits long text into pieces of roughly `size` characters, breaking at sentence ends when possible. */
export function chunkText(text: string, size = 6000): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];

  const sentences = clean.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";

  const push = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };

  for (const sentence of sentences) {
    if (sentence.length > size) {
      // One huge "sentence" (no punctuation): cut it by length.
      push();
      for (let i = 0; i < sentence.length; i += size) chunks.push(sentence.slice(i, i + size));
      continue;
    }
    if (current.length + sentence.length + 1 > size) push();
    current += (current ? " " : "") + sentence;
  }
  push();
  return chunks;
}
