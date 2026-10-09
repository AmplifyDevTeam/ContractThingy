/**
 * Clause / override wording is stored as HTML for PDF rendering.
 * Editors work in plain language with [[Field chips]] instead of raw {{tokens}} / HTML tags.
 */

import { chipsToTokens, tokensToChips } from "@/lib/merge-fields";

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function inlineToPlain(html: string): string {
  // Drop bold/italic wrappers that only wrap a merge token — chips are already distinct.
  let value = html.replace(
    /<(strong|b)(?:\s[^>]*)?>\s*(\{\{\s*[a-zA-Z0-9_.]+\s*\}\})\s*<\/\1>/gi,
    "$2",
  );
  value = value.replace(/<(strong|b)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi, "**$2**");
  value = value.replace(/<(em|i)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi, "_$2_");
  return value;
}

function inlineToHtml(text: string): string {
  // Escape first so placeholders and punctuation stay safe, then re-apply marks.
  // Protect chips so ** around them or accidental escaping of brackets is fine.
  const escaped = escapeHtml(text);
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s("'])_([^_]+)_(?=[\s).,"']|$)/g, "$1<em>$2</em>");
}

/** HTML library wording → editable plain text with [[friendly fields]]. */
export function htmlToEditableLegal(html: string): string {
  if (!html?.trim()) return "";
  let value = html.replace(/\r\n?/g, "\n");
  value = value.replace(/<!--[\s\S]*?-->/g, "");
  value = inlineToPlain(value);
  value = value.replace(/<br\s*\/?>/gi, "\n");
  value = value.replace(/<\/(p|div|h[1-6]|blockquote|tr)>/gi, "\n\n");
  value = value.replace(/<(ul|ol)(?:\s[^>]*)?>/gi, "\n");
  value = value.replace(/<\/(ul|ol)>/gi, "\n\n");
  value = value.replace(/<li(?:\s[^>]*)?>/gi, "- ");
  value = value.replace(/<\/li>/gi, "\n");
  value = value.replace(/<[^>]+>/g, "");
  value = decodeEntities(value);
  value = tokensToChips(value);
  value = value.replace(/[ \t]+\n/g, "\n");
  value = value.replace(/\n{3,}/g, "\n\n");
  value = value
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trimEnd())
    .join("\n");
  return value.trim();
}

/** Human-edited plain text → HTML for storage / assemble (with {{tokens}}). */
export function editableLegalToHtml(text: string): string {
  const withTokens = chipsToTokens(text.trim());
  if (!withTokens) return "";

  // Power users pasting full HTML keep it (still normalize chips → tokens).
  if (/<(p|ul|ol|li|div|br|strong|em)\b/i.test(withTokens)) {
    return chipsToTokens(withTokens);
  }

  const blocks = withTokens.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  const html: string[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((line) => line.trimEnd());
    const nonEmpty = lines.filter((line) => line.trim());
    const bullet = nonEmpty.length > 0 && nonEmpty.every((line) => /^\s*[-*•]\s+/.test(line));
    const numbered = nonEmpty.length > 0 && nonEmpty.every((line) => /^\s*\d+[.)]\s+/.test(line));

    if (bullet) {
      const items = nonEmpty.map((line) => {
        const content = line.replace(/^\s*[-*•]\s+/, "");
        return `<li>${inlineToHtml(content)}</li>`;
      });
      html.push(`<ul>\n${items.join("\n")}\n</ul>`);
      continue;
    }

    if (numbered) {
      const items = nonEmpty.map((line) => {
        const content = line.replace(/^\s*\d+[.)]\s+/, "");
        return `<li>${inlineToHtml(content)}</li>`;
      });
      html.push(`<ol>\n${items.join("\n")}\n</ol>`);
      continue;
    }

    html.push(`<p>${lines.map((line) => inlineToHtml(line.trim())).join("<br/>")}</p>`);
  }

  return html.join("\n");
}

export const LEGAL_TEXT_HINT =
  "Write in plain language. Use blank lines between paragraphs and - for lists. Click a field below to insert values that fill in when the document is generated (shown as [[Employee full name]]).";
