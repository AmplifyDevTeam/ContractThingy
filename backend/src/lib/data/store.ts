import { AsyncLocalStorage } from "node:async_hooks";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { DEFAULT_ORG_ID, dataDir, isFirebaseConfigured, useLocalAdapter } from "@/lib/config";
import { CLIENT_SOURCE_DOCUMENTS } from "@/lib/seed/clients";
import { EMPLOYMENT_SOURCE_DOCUMENTS } from "@/lib/seed/employees";
import { mergeLibraryIntoOrg } from "@/lib/seed/merge";
import { buildBootstrapState, type OrgState } from "@/lib/seed/state";

export type CollectionName =
  | "users"
  | "people"
  | "companies"
  | "templates"
  | "templateVersions"
  | "clauses"
  | "clauseVersions"
  | "documentTypes"
  | "documents"
  | "documentVersions"
  | "documentRelationships"
  | "signingRequests"
  | "signatureEvents"
  | "storedSignatures"
  | "auditEvents"
  | "sourceDocuments"
  | "knowledgeFindings"
  | "documentPacks"
  | "themes"
  | "roleProfiles"
  | "notifications";

export type SettingsKey =
  | "company"
  | "workspace"
  | "ai"
  | "aiUsage"
  | "signing"
  | "email"
  | "security"
  | "sequences";

export interface DataStore {
  orgId: string;
  getDoc<T>(collection: CollectionName, id: string): Promise<T | null>;
  setDoc<T extends { id: string }>(collection: CollectionName, data: T): Promise<void>;
  listDocs<T>(collection: CollectionName): Promise<T[]>;
  queryDocs<T>(collection: CollectionName, predicate: (item: T) => boolean): Promise<T[]>;
  deleteDoc(collection: CollectionName, id: string): Promise<void>;
  getSettings<T>(key: SettingsKey): Promise<T>;
  setSettings<T>(key: SettingsKey, data: T): Promise<void>;
  transact<T>(fn: (store: DataStore) => Promise<T>): Promise<T>;
  putFile(path: string, bytes: Uint8Array, contentType: string): Promise<string>;
  getFile(path: string): Promise<{ bytes: Uint8Array; contentType: string } | null>;
}

type FileMeta = { contentType: string };

type RootState = {
  organizations: Record<string, OrgState>;
  files: Record<string, FileMeta>;
};

let memory: RootState | null = null;
let queue: Promise<unknown> = Promise.resolve();
const held = new AsyncLocalStorage<true>();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  if (held.getStore()) return fn();
  const run = queue.then(
    () => held.run(true, fn),
    () => held.run(true, fn),
  );
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function dbPath(): string {
  return join(dataDir(), "db.json");
}

async function readRoot(): Promise<RootState> {
  if (memory) return memory;
  try {
    const raw = await readFile(dbPath(), "utf8");
    memory = JSON.parse(raw) as RootState;
    return memory;
  } catch {
    memory = { organizations: {}, files: {} };
    return memory;
  }
}

async function persist(root: RootState): Promise<void> {
  memory = root;
  await mkdir(dataDir(), { recursive: true });
  await writeFile(dbPath(), JSON.stringify(root, null, 2), "utf8");
}

function sourceAgreementDirs(): string[] {
  return [
    process.env.CONTRACT_SOURCE_DIR,
    join(process.cwd(), "source-agreements"),
    // Cursor chat attachments from the original Amplify agreement upload set
    "/Users/arhamawan/.cursor/projects/Users-arhamawan-Documents-Amplify-Contract-thing/attachments/f0153983-e2d6-478e-b263-c04805c2b562",
  ].filter((dir): dir is string => Boolean(dir));
}

async function ensureSourceAgreementFiles(root: RootState): Promise<boolean> {
  const srcDir = sourceAgreementDirs().find((dir) => existsSync(dir));
  if (!srcDir) return false;
  let changed = false;
  await mkdir(join(dataDir(), "storage", "source-agreements"), { recursive: true });
  for (const doc of [...CLIENT_SOURCE_DOCUMENTS, ...EMPLOYMENT_SOURCE_DOCUMENTS]) {
    const dest = join(dataDir(), "storage", doc.storagePath);
    if (!existsSync(dest)) {
      const src = join(srcDir, doc.fileName);
      if (!existsSync(src)) continue;
      await mkdir(dirname(dest), { recursive: true });
      await copyFile(src, dest);
      changed = true;
    }
    if (!root.files[doc.storagePath]) {
      root.files[doc.storagePath] = { contentType: "application/pdf" };
      changed = true;
    }
  }
  return changed;
}

async function ensureOrg(root: RootState, orgId: string): Promise<OrgState> {
  let changed = false;
  if (!root.organizations[orgId]) {
    root.organizations[orgId] = buildBootstrapState(orgId);
    changed = true;
  } else if (mergeLibraryIntoOrg(root.organizations[orgId])) {
    changed = true;
  }
  if (await ensureSourceAgreementFiles(root)) changed = true;
  if (changed) await persist(root);
  return root.organizations[orgId];
}

class LocalStore implements DataStore {
  constructor(public orgId: string) {}

  async getDoc<T>(collection: CollectionName, id: string): Promise<T | null> {
    const root = await readRoot();
    const org = await ensureOrg(root, this.orgId);
    const list = org[collection] as unknown as Array<{ id: string }>;
    return (list.find((item) => item.id === id) as T | undefined) ?? null;
  }

  async setDoc<T extends { id: string }>(collection: CollectionName, data: T): Promise<void> {
    await withLock(async () => {
      const root = await readRoot();
      const org = await ensureOrg(root, this.orgId);
      const list = org[collection] as unknown as Array<{ id: string }>;
      const index = list.findIndex((item) => item.id === data.id);
      if (index >= 0) list[index] = data;
      else list.push(data);
      await persist(root);
    });
  }

  async listDocs<T>(collection: CollectionName): Promise<T[]> {
    const root = await readRoot();
    const org = await ensureOrg(root, this.orgId);
    return [...(org[collection] as unknown as T[])];
  }

  async queryDocs<T>(collection: CollectionName, predicate: (item: T) => boolean): Promise<T[]> {
    const all = await this.listDocs<T>(collection);
    return all.filter(predicate);
  }

  async deleteDoc(collection: CollectionName, id: string): Promise<void> {
    await withLock(async () => {
      const root = await readRoot();
      const org = await ensureOrg(root, this.orgId);
      const list = org[collection] as unknown as Array<{ id: string }>;
      const next = list.filter((item) => item.id !== id);
      (org[collection] as unknown as Array<{ id: string }>) = next;
      await persist(root);
    });
  }

  async getSettings<T>(key: SettingsKey): Promise<T> {
    const root = await readRoot();
    const org = await ensureOrg(root, this.orgId);
    return org.settings[key] as T;
  }

  async setSettings<T>(key: SettingsKey, data: T): Promise<void> {
    await withLock(async () => {
      const root = await readRoot();
      const org = await ensureOrg(root, this.orgId);
      org.settings[key] = data as never;
      await persist(root);
    });
  }

  async transact<T>(fn: (store: DataStore) => Promise<T>): Promise<T> {
    return withLock(() => fn(this));
  }

  async putFile(path: string, bytes: Uint8Array, contentType: string): Promise<string> {
    const abs = join(dataDir(), "storage", path);
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, bytes);
    await withLock(async () => {
      const root = await readRoot();
      root.files[path] = { contentType };
      await persist(root);
    });
    return path;
  }

  async getFile(path: string): Promise<{ bytes: Uint8Array; contentType: string } | null> {
    try {
      const abs = join(dataDir(), "storage", path);
      const bytes = await readFile(abs);
      const root = await readRoot();
      return { bytes, contentType: root.files[path]?.contentType ?? "application/octet-stream" };
    } catch {
      return null;
    }
  }
}

export async function getStore(orgId = DEFAULT_ORG_ID): Promise<DataStore> {
  if (!useLocalAdapter() && isFirebaseConfigured()) {
    const { FirestoreStore } = await import("@/lib/data/firestore-store");
    return new FirestoreStore(orgId);
  }
  return new LocalStore(orgId);
}

export async function resetLocalStore(orgId = DEFAULT_ORG_ID): Promise<void> {
  await withLock(async () => {
    const root = await readRoot();
    root.organizations[orgId] = buildBootstrapState(orgId);
    await persist(root);
  });
}
