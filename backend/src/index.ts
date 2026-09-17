import { serve } from "@hono/node-server";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createApp } from "./app";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), "../.env.local"));
loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), "../.env"));

const port = Number(process.env.PORT || process.env.API_PORT || 4000);
const app = createApp();

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Amplify ContractOS API listening on http://localhost:${info.port}`);
});
