import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { LIBRARY_REVISION, buildBootstrapState } from "@/lib/seed/state";
import type { CollectionName, DataStore, SettingsKey } from "@/lib/data/store";

const SEEDED = new Set<string>();
/** Stay under Firestore's ~1 MiB doc limit (base64 expands ~4/3). */
const CHUNK_CHARS = 700_000;

const SETTINGS_KEYS: SettingsKey[] = [
  "company",
  "workspace",
  "ai",
  "aiUsage",
  "signing",
  "email",
  "security",
  "sequences",
];

const BOOTSTRAP_COLLECTIONS: CollectionName[] = [
  "users",
  "people",
  "companies",
  "templates",
  "templateVersions",
  "clauses",
  "clauseVersions",
  "documentTypes",
  "documents",
  "documentVersions",
  "documentRelationships",
  "signingRequests",
  "signatureEvents",
  "storedSignatures",
  "auditEvents",
  "sourceDocuments",
  "knowledgeFindings",
  "documentPacks",
  "themes",
  "roleProfiles",
  "notifications",
];

/**
 * Library collections change rarely (seeded, edited only by admins), but are read on almost
 * every request. Cache them per serverless instance to cut Firestore reads.
 */
const CACHEABLE = new Set<CollectionName>([
  "templates",
  "templateVersions",
  "clauses",
  "clauseVersions",
  "documentTypes",
  "themes",
  "roleProfiles",
  "documentPacks",
  "knowledgeFindings",
  "sourceDocuments",
]);
const CACHE_TTL_MS = 5 * 60 * 1000;
const listCache = new Map<string, { at: number; items: unknown[] }>();
const settingsCache = new Map<string, { at: number; value: unknown }>();
const SETTINGS_TTL_MS = 30 * 1000;

function fileDocId(path: string): string {
  return createHash("sha256").update(path).digest("hex").slice(0, 40);
}

export class FirestoreStore implements DataStore {
  constructor(public orgId: string) {}

  private col(collection: CollectionName) {
    return adminDb().collection("organizations").doc(this.orgId).collection(collection);
  }

  private settingsCol() {
    return adminDb().collection("organizations").doc(this.orgId).collection("settings");
  }

  /** Complete a partial bootstrap (org doc written, settings/themes missing). */
  private async repairBootstrap(): Promise<void> {
    const seed = buildBootstrapState(this.orgId);
    const orgRef = adminDb().collection("organizations").doc(this.orgId);
    const orgSnap = await orgRef.get();
    if (!orgSnap.exists) {
      await orgRef.set({
        id: this.orgId,
        name: "Amplify Media Technologies",
        bootstrappedAt: new Date().toISOString(),
      });
    }

    for (const name of BOOTSTRAP_COLLECTIONS) {
      const existing = await this.col(name).limit(1).get();
      if (!existing.empty) continue;
      const items = seed[name] as Array<{ id: string }>;
      for (const item of items) {
        await this.col(name).doc(item.id).set(item);
      }
    }

    for (const key of SETTINGS_KEYS) {
      const snap = await this.settingsCol().doc(key).get();
      if (snap.exists) continue;
      await this.settingsCol().doc(key).set(seed.settings[key] as Record<string, unknown>);
    }
  }

  /** Upsert seeded library collections when the code's library revision is newer. */
  private async syncLibrary(): Promise<void> {
    const orgRef = adminDb().collection("organizations").doc(this.orgId);
    const orgSnap = await orgRef.get();
    const current = Number((orgSnap.data() as { libraryRevision?: number } | undefined)?.libraryRevision ?? 1);
    if (current >= LIBRARY_REVISION) return;
    const seed = buildBootstrapState(this.orgId);
    const library: CollectionName[] = [
      "templates",
      "templateVersions",
      "clauses",
      "clauseVersions",
      "themes",
      "roleProfiles",
      "documentTypes",
    ];
    for (const name of library) {
      const items = seed[name] as Array<{ id: string }>;
      let batch = adminDb().batch();
      let count = 0;
      for (const item of items) {
        batch.set(this.col(name).doc(item.id), item);
        count += 1;
        if (count % 400 === 0) {
          await batch.commit();
          batch = adminDb().batch();
        }
      }
      await batch.commit();
      listCache.delete(`${this.orgId}:${name}`);
    }
    await orgRef.set({ libraryRevision: LIBRARY_REVISION, librarySyncedAt: new Date().toISOString() }, { merge: true });
  }

  private async ensureSeed(): Promise<void> {
    if (SEEDED.has(this.orgId)) return;
    // Fast path: healthy org already has company settings — skip collection scans.
    const company = await this.settingsCol().doc("company").get();
    if (!company.exists) await this.repairBootstrap();
    try {
      await this.syncLibrary();
    } catch (err) {
      console.error("[firestore] library sync failed", err instanceof Error ? err.message : err);
    }
    SEEDED.add(this.orgId);
  }

  async getDoc<T>(collection: CollectionName, id: string): Promise<T | null> {
    await this.ensureSeed();
    const snap = await this.col(collection).doc(id).get();
    return snap.exists ? (snap.data() as T) : null;
  }

  async setDoc<T extends { id: string }>(collection: CollectionName, data: T): Promise<void> {
    await this.ensureSeed();
    await this.col(collection).doc(data.id).set(data);
    listCache.delete(`${this.orgId}:${collection}`);
  }

  async listDocs<T>(collection: CollectionName): Promise<T[]> {
    await this.ensureSeed();
    const key = `${this.orgId}:${collection}`;
    if (CACHEABLE.has(collection)) {
      const hit = listCache.get(key);
      if (hit && Date.now() - hit.at < CACHE_TTL_MS) return [...(hit.items as T[])];
    }
    const snap = await this.col(collection).get();
    const items = snap.docs.map((doc) => doc.data() as T);
    if (CACHEABLE.has(collection)) listCache.set(key, { at: Date.now(), items });
    return items;
  }

  async whereEquals<T>(collection: CollectionName, field: string, value: string | number | boolean): Promise<T[]> {
    await this.ensureSeed();
    if (CACHEABLE.has(collection)) {
      const all = await this.listDocs<Record<string, unknown>>(collection);
      return all.filter((item) => item[field] === value) as T[];
    }
    const snap = await this.col(collection).where(field, "==", value).get();
    return snap.docs.map((doc) => doc.data() as T);
  }

  async nextSequence(key: string): Promise<number> {
    await this.ensureSeed();
    const ref = this.settingsCol().doc("sequences");
    const next = await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const current = Number((snap.data() as Record<string, number> | undefined)?.[key] ?? 0);
      tx.set(ref, { [key]: FieldValue.increment(1) }, { merge: true });
      return current + 1;
    });
    settingsCache.delete(`${this.orgId}:sequences`);
    return next;
  }

  async queryDocs<T>(collection: CollectionName, predicate: (item: T) => boolean): Promise<T[]> {
    const all = await this.listDocs<T>(collection);
    return all.filter(predicate);
  }

  async deleteDoc(collection: CollectionName, id: string): Promise<void> {
    await this.col(collection).doc(id).delete();
    listCache.delete(`${this.orgId}:${collection}`);
  }

  async getSettings<T>(key: SettingsKey): Promise<T> {
    await this.ensureSeed();
    const cacheKey = `${this.orgId}:${key}`;
    const hit = settingsCache.get(cacheKey);
    if (hit && key !== "sequences" && Date.now() - hit.at < SETTINGS_TTL_MS) return hit.value as T;
    const snap = await this.settingsCol().doc(key).get();
    if (!snap.exists) {
      const seed = buildBootstrapState(this.orgId);
      const value = seed.settings[key];
      await this.settingsCol().doc(key).set(value as Record<string, unknown>);
      return value as T;
    }
    const value = snap.data() as T;
    settingsCache.set(cacheKey, { at: Date.now(), value });
    return value;
  }

  async setSettings<T>(key: SettingsKey, data: T): Promise<void> {
    await this.settingsCol().doc(key).set(data as Record<string, unknown>);
    settingsCache.delete(`${this.orgId}:${key}`);
  }

  async transact<T>(fn: (store: DataStore) => Promise<T>): Promise<T> {
    return adminDb().runTransaction(async () => fn(this));
  }

  async putFile(path: string, bytes: Uint8Array, contentType: string): Promise<string> {
    // Free Spark: store binaries in Firestore (no Cloud Storage required).
    const id = fileDocId(path);
    const base64 = Buffer.from(bytes).toString("base64");
    const metaRef = adminDb()
      .collection("organizations")
      .doc(this.orgId)
      .collection("files")
      .doc(id);
    const chunks = Math.ceil(base64.length / CHUNK_CHARS) || 1;
    await metaRef.set({
      path,
      contentType,
      byteLength: bytes.byteLength,
      chunks,
      updatedAt: new Date().toISOString(),
    });
    for (let i = 0; i < chunks; i++) {
      const slice = base64.slice(i * CHUNK_CHARS, (i + 1) * CHUNK_CHARS);
      await metaRef.collection("chunks").doc(String(i)).set({ data: slice });
    }
    return path;
  }

  async getFile(path: string): Promise<{ bytes: Uint8Array; contentType: string } | null> {
    try {
      const id = fileDocId(path);
      const metaRef = adminDb()
        .collection("organizations")
        .doc(this.orgId)
        .collection("files")
        .doc(id);
      const meta = await metaRef.get();
      if (!meta.exists) return null;
      const data = meta.data() as {
        contentType?: string;
        chunks?: number;
        base64?: string;
      };
      // Legacy single-doc shape (if any)
      if (data.base64) {
        return {
          bytes: Buffer.from(data.base64, "base64"),
          contentType: data.contentType ?? "application/octet-stream",
        };
      }
      const count = data.chunks ?? 0;
      if (count <= 0) return null;
      const parts: string[] = [];
      for (let i = 0; i < count; i++) {
        const chunk = await metaRef.collection("chunks").doc(String(i)).get();
        if (!chunk.exists) return null;
        parts.push(String((chunk.data() as { data?: string }).data ?? ""));
      }
      return {
        bytes: Buffer.from(parts.join(""), "base64"),
        contentType: data.contentType ?? "application/octet-stream",
      };
    } catch {
      return null;
    }
  }
}
