/**
 * Splits text into overlapping chunks on paragraph/sentence boundaries.
 * ~1200 chars keeps each chunk focused while giving the model enough context.
 */
export function chunkText(text: string, size = 1200, overlap = 200): string[] {
  const clean = text.replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];

  // Break into sentence-ish pieces, hard-splitting anything still too long.
  const pieces: string[] = [];
  for (const para of clean.split(/\n\n+/)) {
    for (const raw of para.split(/(?<=[.!?])\s+|\n/)) {
      const sentence = `${raw} `;
      for (let i = 0; i < sentence.length; i += size) pieces.push(sentence.slice(i, i + size));
    }
    pieces.push("\n\n");
  }

  const chunks: string[] = [];
  let current = "";
  for (const piece of pieces) {
    if (current.length + piece.length > size && current.trim()) {
      chunks.push(current.trim());
      // Carry the tail of the previous chunk forward, starting at a word boundary.
      const tail = current.slice(-overlap);
      current = tail.slice(tail.indexOf(" ") + 1);
    }
    current += piece;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}
