export function securityStatus() {
  return {
    sessionSecretConfigured: true,
    production: process.env.NODE_ENV === "production",
    secureCookies: process.env.NODE_ENV === "production",
    dataAdapter: "api" as const,
    firebaseConfigured: false,
  };
}

export async function loadSecuritySettings() {
  return {
    sessionDays: 14,
    minPasswordLength: 8,
    requireMixedCase: true,
    requireDigit: true,
    requireSymbol: false,
  };
}
