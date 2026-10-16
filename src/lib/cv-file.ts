/**
 * Reads the text of a CV file in the browser. Nothing is uploaded to a server.
 * Supports PDF (text-based), Word .docx and plain text.
 */

export const CV_ACCEPT = ".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";
const MAX_BYTES = 5 * 1024 * 1024;

export class CvFileError extends Error {}

function tidy(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function cvKind(name: string, type = ""): "pdf" | "docx" | "text" | "doc" | "other" {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (ext === "pdf" || type === "application/pdf") return "pdf";
  if (ext === "docx" || type.includes("wordprocessingml")) return "docx";
  if (ext === "doc" || type === "application/msword") return "doc";
  if (["txt", "md", "text"].includes(ext) || type.startsWith("text/")) return "text";
  return "other";
}

export async function readCvFile(file: File): Promise<string> {
  if (file.size > MAX_BYTES) throw new CvFileError("That file is over 5 MB. Try exporting your CV as a smaller PDF.");
  const kind = cvKind(file.name, file.type);
  if (kind === "doc") throw new CvFileError("Older .doc files can't be read. In Word, choose File → Save As → .docx or PDF, then upload that.");
  if (kind === "other") throw new CvFileError("Upload a PDF, Word (.docx) or .txt file.");

  let text = "";
  if (kind === "text") {
    text = await file.text();
  } else if (kind === "pdf") {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
    const out = await extractText(pdf, { mergePages: true });
    text = Array.isArray(out.text) ? out.text.join("\n") : out.text;
  } else {
    const mammoth = await import("mammoth");
    const res = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    text = res.value;
  }

  text = tidy(text);
  if (text.length < 40) {
    throw new CvFileError(
      kind === "pdf"
        ? "We couldn't find any text in that PDF. It may be a scanned image. Try exporting your CV from Word or Google Docs as a PDF, or upload the .docx."
        : "That file looks empty.",
    );
  }
  return text.slice(0, 20_000);
}
