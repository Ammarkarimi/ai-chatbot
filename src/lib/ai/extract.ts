import "server-only";

export const SUPPORTED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md", ".csv"] as const;

export class UnsupportedFileError extends Error {}

function extension(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

export async function extractText(file: File): Promise<string> {
  const ext = extension(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());

  if (ext === ".pdf") {
    const { extractText: extractPdf, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractPdf(pdf, { mergePages: true });
    return text;
  }
  if (ext === ".docx") {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }
  if (ext === ".txt" || ext === ".md" || ext === ".csv") {
    return buffer.toString("utf8");
  }
  if (ext === ".doc") {
    throw new UnsupportedFileError("Legacy .doc files aren't supported. Save the file as .docx or PDF and upload again.");
  }
  throw new UnsupportedFileError(`Unsupported file type "${ext || file.type}". Use PDF, DOCX, TXT, MD or CSV.`);
}
