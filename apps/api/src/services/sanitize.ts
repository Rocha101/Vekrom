import { createHash } from "node:crypto";

/** Escape HTML para renderização segura (nunca usar dangerouslySetInnerHTML direto). */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Mini markdown seguro: **bold**, *italic*, `code`, ```block```, @menções, :emoji:. Retorna HTML já escapado. */
export function renderMarkdownSafe(raw: string): string {
  let h = escapeHtml(raw);
  h = h.replace(/```([\s\S]*?)```/g, (_m, c) => `<pre><code>${c}</code></pre>`);
  h = h.replace(/`([^`]+?)`/g, "<code>$1</code>");
  h = h.replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>");
  h = h.replace(/(^|\W)\*([^*\n]+?)\*/g, "$1<em>$2</em>");
  h = h.replace(/@([a-zA-Z0-9_]{2,32})/g, `<span class="mention">@$1</span>`);
  return h;
}

/** Validação de MIME real por magic bytes (não só extensão). */
const MAGIC: Array<{ mime: string; sig: number[] }> = [
  { mime: "image/png", sig: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/jpeg", sig: [0xff, 0xd8, 0xff] },
  { mime: "image/gif", sig: [0x47, 0x49, 0x46] },
];

export function sniffMime(buf: Buffer): string | null {
  for (const m of MAGIC) {
    if (m.sig.every((b, i) => buf[i] === b)) return m.mime;
  }
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WAVE") return "audio/wav";
  if (buf.length >= 4 && buf.toString("ascii", 0, 4) === "OggS") return "audio/ogg";
  if (buf.length >= 4 && buf.toString("ascii", 0, 4) === "fLaC") return "audio/flac";
  if (buf.length >= 3 && buf.toString("ascii", 0, 3) === "ID3") return "audio/mpeg";
  if (buf.length >= 2 && buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return "audio/mpeg";
  if (buf.length >= 12 && buf.toString("ascii", 4, 8) === "ftyp") return "audio/mp4";
  return null;
}

export function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}
