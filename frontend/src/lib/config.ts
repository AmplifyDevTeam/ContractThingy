export function geminiEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_GEMINI_ENABLED === "true" || process.env.GEMINI_API_KEY);
}

export function appUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}
