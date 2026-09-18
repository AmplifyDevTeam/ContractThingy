import { getApps, initializeApp, cert, applicationDefault, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { isFirebaseConfigured } from "@/lib/config";

/** Normalize PEM from Vercel/env dashboards (quoted, escaped newlines, etc.). */
export function normalizeFirebasePrivateKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let key = raw.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  key = key.replaceAll("\\n", "\n");
  if (!key.includes("BEGIN PRIVATE KEY")) return undefined;
  return key;
}

function privateKey(): string | undefined {
  return normalizeFirebasePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
}

let app: App | null = null;
let initError: string | null = null;

export function firebaseAdminStatus(): {
  configured: boolean;
  projectId: string | null;
  error: string | null;
} {
  return {
    configured: isFirebaseConfigured() && Boolean(privateKey()),
    projectId: process.env.FIREBASE_PROJECT_ID?.trim() || null,
    error: initError,
  };
}

export function getFirebaseAdmin(): App {
  if (app) return app;
  if (getApps().length > 0) {
    app = getApps()[0]!;
    return app;
  }
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const key = privateKey();
  try {
    if (projectId && clientEmail && key) {
      app = initializeApp({
        credential: cert({ projectId, clientEmail, privateKey: key }),
        projectId,
      });
      initError = null;
      return app;
    }
    if (process.env.NODE_ENV === "production") {
      initError =
        "Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY on the API.";
      throw new Error(initError);
    }
    app = initializeApp({
      credential: applicationDefault(),
      projectId,
    });
    initError = null;
    return app;
  } catch (err) {
    initError = err instanceof Error ? err.message : "Firebase Admin init failed";
    throw err;
  }
}

export function adminDb() {
  const db = getFirestore(getFirebaseAdmin());
  try {
    // Seed payloads often omit optional fields as undefined — Firestore rejects those.
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    /* settings() may only be called once per app */
  }
  return db;
}

export function adminAuth() {
  return getAuth(getFirebaseAdmin());
}
