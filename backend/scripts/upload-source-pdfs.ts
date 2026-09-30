/**
 * Upload the historical source agreements (Knowledge → "Open PDF") into the configured store.
 *
 * Production stores files in Firestore, but the bootstrap only copied PDFs into the local
 * `.data/storage` folder, so every "Open PDF" link returned 404 on the live site.
 *
 * Usage (from the repo root, with the backend Firebase env vars in .env.local):
 *   DATA_ADAPTER=firestore npm run upload:sources --workspace=backend
 * Options:
 *   CONTRACT_SOURCE_DIR=/path/to/pdfs   folder containing the original PDF files
 *   --force                             re-upload files that already exist
 */
import { existsSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { CLIENT_SOURCE_DOCUMENTS } from "../src/lib/seed/clients";
import { EMPLOYMENT_SOURCE_DOCUMENTS } from "../src/lib/seed/employees";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function main() {
  loadEnvFile(resolve(process.cwd(), ".env.local"));
  loadEnvFile(resolve(process.cwd(), "../.env.local"));
  const force = process.argv.includes("--force");

  const { getStore } = await import("../src/lib/data/store");
  const { useLocalAdapter } = await import("../src/lib/config");
  const store = await getStore();
  console.log(`Target store: ${useLocalAdapter() ? "local .data" : "Firestore"} (org ${store.orgId})`);

  const dirs = [
    process.env.CONTRACT_SOURCE_DIR,
    resolve(process.cwd(), "../.data/storage/source-agreements"),
    resolve(process.cwd(), ".data/storage/source-agreements"),
    resolve(process.cwd(), "source-agreements"),
  ].filter((dir): dir is string => Boolean(dir && existsSync(dir)));
  if (dirs.length === 0) {
    throw new Error("No source folder found. Set CONTRACT_SOURCE_DIR to the folder with the original PDFs.");
  }

  let uploaded = 0;
  let skipped = 0;
  const missing: string[] = [];
  for (const doc of [...CLIENT_SOURCE_DOCUMENTS, ...EMPLOYMENT_SOURCE_DOCUMENTS]) {
    const file = dirs.map((dir) => join(dir, basename(doc.fileName))).find((candidate) => existsSync(candidate));
    if (!file) {
      missing.push(doc.fileName);
      continue;
    }
    if (!force && (await store.getFile(doc.storagePath))) {
      skipped += 1;
      continue;
    }
    await store.putFile(doc.storagePath, new Uint8Array(readFileSync(file)), "application/pdf");
    uploaded += 1;
    console.log(`  ✓ ${doc.fileName}`);
  }
  console.log(`\nUploaded ${uploaded}, already present ${skipped}, missing locally ${missing.length}.`);
  if (missing.length) console.log(`Missing:\n  ${missing.join("\n  ")}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
