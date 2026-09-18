import { createHash } from "node:crypto";
import { adminDb } from "@/lib/firebase/admin";
import { buildBootstrapState } from "@/lib/seed/state";
import type { CollectionName, DataStore, SettingsKey } from "@/lib/data/store";

const SEEDED = new Set<string>();
/** Stay under Firestore's ~1 MiB doc limit (base64 expands ~4/3). */
const CHUNK_CHARS = 700_000;

const SETTINGS_KEYS: SettingsKey[] = [
  "company",
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

  private async ensureSeed(): Promise<void> {
    if (SEEDED.has(this.orgId)) return;
    await this.repairBootstrap();
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
  }

  async listDocs<T>(collection: CollectionName): Promise<T[]> {
    await this.ensureSeed();
    const snap = await this.col(collection).get();
    return snap.docs.map((doc) => doc.data() as T);
  }

  async queryDocs<T>(collection: CollectionName, predicate: (item: T) => boolean): Promise<T[]> {
    const all = await this.listDocs<T>(collection);
    return all.filter(predicate);
  }

  async deleteDoc(collection: CollectionName, id: string): Promise<void> {
    await this.col(collection).doc(id).delete();
  }

  async getSettings<T>(key: SettingsKey): Promise<T> {
    await this.ensureSeed();
    const snap = await this.settingsCol().doc(key).get();
    if (!snap.exists) {
      const seed = buildBootstrapState(this.orgId);
      const value = seed.settings[key];
      await this.settingsCol().doc(key).set(value as Record<string, unknown>);
      return value as T;
    }
    return snap.data() as T;
  }

  async setSettings<T>(key: SettingsKey, data: T): Promise<void> {
    await this.settingsCol().doc(key).set(data as Record<string, unknown>);
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
