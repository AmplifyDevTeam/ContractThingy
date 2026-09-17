import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type PageFormat = "A4" | "Letter";
type Box = { top: string; right: string; bottom: string; left: string };

const DEFAULT_MARGINS: Box = { top: "18mm", right: "16mm", bottom: "18mm", left: "16mm" };

function parseMargins(html: string): Box {
  const padded = html.match(
    /@media print[\s\S]*?padding:\s*([0-9.]+(?:mm|in|px))\s+([0-9.]+(?:mm|in|px))\s+([0-9.]+(?:mm|in|px))\s+([0-9.]+(?:mm|in|px))/,
  );
  if (padded) {
    return { top: padded[1], right: padded[2], bottom: padded[3], left: padded[4] };
  }
  const pageMargin = html.match(/@page\s*\{[^}]*margin:\s*([^;}]+)/);
  if (pageMargin) {
    const parts = pageMargin[1].trim().split(/\s+/);
    if (parts.length === 4) {
      if (parts.every((part) => /^0(?:mm|px|in)?$/.test(part))) return DEFAULT_MARGINS;
      return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
    }
    if (parts.length === 2) return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] };
    if (parts.length === 1 && parts[0] !== "0") {
      return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
    }
  }
  return DEFAULT_MARGINS;
}

function inlinePublicAssets(html: string): string {
  return html.replace(/src="(\/(?:branding)\/[^"]+)"/g, (full, path: string) => {
    const file = join(process.cwd(), "public", path);
    if (!existsSync(file)) return full;
    const bytes = readFileSync(file);
    const mime = path.endsWith(".jpg") || path.endsWith(".jpeg") ? "image/jpeg" : "image/png";
    return `src="data:${mime};base64,${bytes.toString("base64")}"`;
  });
}

function prepareHtmlForPdf(html: string): { html: string; format: PageFormat } {
  const format: PageFormat = /size:\s*Letter/i.test(html) ? "Letter" : "A4";
  const dark = /theme-dark/.test(html) || /background:\s*#0c0d0b/i.test(html);
  const background = dark ? "#0c0d0b" : "#ffffff";
  const margins = parseMargins(html);
  const stripped = html.replace(/@page\s*\{[^}]*\}/g, "");
  const css = `
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: ${background} !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .pdf-bleed { display: none !important; }
    .page {
      max-width: none !important;
      width: auto !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: ${margins.top} ${margins.right} ${margins.bottom} ${margins.left} !important;
      background: ${background} !important;
      box-decoration-break: clone !important;
      -webkit-box-decoration-break: clone !important;
    }
    .doc-footer {
      display: flex !important;
      position: fixed !important;
      left: ${margins.left} !important;
      right: ${margins.right} !important;
      bottom: 7mm !important;
      margin: 0 !important;
      background: ${background} !important;
    }
    .certificate { break-before: page; }
    .section-lead, .signatures, .sig-grid, .sig-block {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
    .doc-section h2 {
      break-after: avoid !important;
      page-break-after: avoid !important;
    }
    .clause p, .clause li {
      orphans: 3;
      widows: 3;
    }
  `;
  const prepared = stripped.includes("</head>")
    ? stripped.replace("</head>", `<style data-pdf-bleed="true">${css}</style></head>`)
    : `<style data-pdf-bleed="true">${css}</style>${stripped}`;
  return { html: inlinePublicAssets(prepared), format };
}

export async function renderPdf(html: string): Promise<Uint8Array> {
  try {
    const { chromium } = await import("playwright");
    const prepared = prepareHtmlForPdf(html);
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ media: "print" });
      await page.setContent(prepared.html, { waitUntil: "load" });
      const pdf = await page.pdf({
        width: prepared.format === "Letter" ? "8.5in" : "210mm",
        height: prepared.format === "Letter" ? "11in" : "297mm",
        printBackground: true,
        preferCSSPageSize: false,
        displayHeaderFooter: false,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });
      return new Uint8Array(pdf);
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.warn("[pdf] Playwright unavailable, storing HTML fallback", error);
    return new TextEncoder().encode(html);
  }
}
