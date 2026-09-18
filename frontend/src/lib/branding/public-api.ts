/** Public API base for browser assets (logos). */
export function publicApiBase() {
  const configured = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  if (configured && !configured.includes("contract-thingy-backend.vercel.app")) return configured;
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    return "https://amplify-contractos-api.vercel.app";
  }
  return "http://localhost:4000";
}

export function workspaceLogoUrl(variant: "dark" | "light" = "dark", cacheKey?: string) {
  const q = cacheKey ? `&v=${encodeURIComponent(cacheKey)}` : "";
  return `${publicApiBase()}/workspace/branding/logo?variant=${variant}${q}`;
}

export function workspaceAssetUrl(
  kind: "logoDark" | "logoLight" | "seal" | "signature",
  cacheKey?: string,
) {
  const q = cacheKey ? `&v=${encodeURIComponent(cacheKey)}` : "";
  return `${publicApiBase()}/workspace/branding/asset?kind=${kind}${q}`;
}
