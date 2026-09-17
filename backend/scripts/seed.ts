import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildBootstrapState } from "../src/lib/seed/state";

async function main() {
  const orgId = process.env.DEFAULT_ORG_ID || "amplify-media-technologies";
  const dataDir = process.env.DATA_DIR || join(process.cwd(), ".data");
  const root = {
    organizations: {
      [orgId]: buildBootstrapState(orgId),
    },
    files: {},
  };
  await mkdir(dataDir, { recursive: true });
  await writeFile(join(dataDir, "db.json"), JSON.stringify(root, null, 2), "utf8");
  console.log("Reset local workspace: library + historical agreements + admin.");
  console.log(
    `People/clients/sources loaded from real Amplify agreements (no fictional demos).`,
  );
  if (!process.env.BOOTSTRAP_ADMIN_EMAIL || !process.env.BOOTSTRAP_ADMIN_PASSWORD) {
    console.log("Local admin (dev fallback): admin@localhost / change-me-now");
    console.log("Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD for a real admin.");
  } else {
    console.log(`Admin: ${process.env.BOOTSTRAP_ADMIN_EMAIL}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
