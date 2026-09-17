import { DEFAULT_ORG_ID, useLocalAdapter, isFirebaseConfigured } from "@/lib/config";
import type { DataStore } from "@/lib/data/store";
import { getStore } from "@/lib/data/store";
import type { SecuritySettings } from "@/lib/types";

export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  sessionDays: 14,
  minPasswordLength: 8,
  requireMixedCase: false,
  requireDigit: false,
  requireSymbol: false,
};

export async function loadSecuritySettings(store?: DataStore): Promise<SecuritySettings> {
  const active = store ?? (await getStore(DEFAULT_ORG_ID));
  const stored = await active.getSettings<SecuritySettings | undefined>("security");
  return {
    sessionDays: stored?.sessionDays ?? DEFAULT_SECURITY_SETTINGS.sessionDays,
    minPasswordLength: stored?.minPasswordLength ?? DEFAULT_SECURITY_SETTINGS.minPasswordLength,
    requireMixedCase: stored?.requireMixedCase ?? DEFAULT_SECURITY_SETTINGS.requireMixedCase,
    requireDigit: stored?.requireDigit ?? DEFAULT_SECURITY_SETTINGS.requireDigit,
    requireSymbol: stored?.requireSymbol ?? DEFAULT_SECURITY_SETTINGS.requireSymbol,
  };
}

export function assertPasswordPolicy(password: string, settings: SecuritySettings) {
  if (password.length < settings.minPasswordLength) {
    throw new Error(`Password must be at least ${settings.minPasswordLength} characters`);
  }
  if (settings.requireMixedCase && (!/[a-z]/.test(password) || !/[A-Z]/.test(password))) {
    throw new Error("Password must include upper and lower case letters");
  }
  if (settings.requireDigit && !/\d/.test(password)) {
    throw new Error("Password must include a number");
  }
  if (settings.requireSymbol && !/[^A-Za-z0-9]/.test(password)) {
    throw new Error("Password must include a symbol");
  }
}

export type SecurityStatus = {
  sessionSecretConfigured: boolean;
  production: boolean;
  secureCookies: boolean;
  dataAdapter: "local" | "firestore";
  firebaseConfigured: boolean;
};

export function securityStatus(): SecurityStatus {
  const production = process.env.NODE_ENV === "production";
  const raw = process.env.SESSION_SECRET?.trim() ?? "";
  const configured = Boolean(raw) && raw !== "replace-with-a-long-random-string";
  return {
    sessionSecretConfigured: configured,
    production,
    secureCookies: production,
    dataAdapter: useLocalAdapter() ? "local" : "firestore",
    firebaseConfigured: isFirebaseConfigured(),
  };
}
