import { getApps, initializeApp, cert, applicationDefault, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function privateKey(): string | undefined {
  return process.env.FIREBASE_PRIVATE_KEY?.replaceAll("\\n", "\n");
}

let app: App | null = null;

export function getFirebaseAdmin(): App {
  if (app) return app;
  if (getApps().length > 0) {
    app = getApps()[0]!;
    return app;
  }
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const key = privateKey();
  if (projectId && clientEmail && key) {
    app = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey: key }),
      projectId,
    });
  } else {
    app = initializeApp({
      credential: applicationDefault(),
      projectId,
    });
  }
  return app;
}

export function adminDb() {
  return getFirestore(getFirebaseAdmin());
}

export function adminAuth() {
  return getAuth(getFirebaseAdmin());
}
