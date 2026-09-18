import { DEFAULT_ORG_ID } from "@/lib/config";
import {
  DEFAULT_WORKSPACE,
  isStoredBrandingPath,
  resolveBrandingAssets,
} from "@/lib/branding/identity";
import type { DataStore } from "@/lib/data/store";
import { workspaceSettingsSchema, type WorkspaceSettings, type CompanySettings } from "@/lib/validation/schemas";

export type BrandingUploadKind = "logoDark" | "logoLight" | "seal" | "signature";

const KIND_FILE: Record<BrandingUploadKind, { file: string; field: keyof CompanySettings }> = {
  logoDark: { file: "logo-dark.png", field: "logoDarkPath" },
  logoLight: { file: "logo-light.png", field: "logoLightPath" },
  seal: { file: "seal.png", field: "sealPath" },
  signature: { file: "signature.png", field: "signaturePath" },
};

export function parseDataUrl(dataUrl: string): { bytes: Uint8Array; contentType: string } {
  const match = /^data:([^;,]+);base64,(.+)$/i.exec(dataUrl.trim());
  if (!match) throw new Error("Expected a base64 data URL");
  const contentType = match[1].toLowerCase();
  if (!contentType.startsWith("image/")) throw new Error("Only image uploads are supported");
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.byteLength === 0) throw new Error("Empty image");
  if (bytes.byteLength > 2_500_000) throw new Error("Image must be under 2.5 MB");
  return { bytes: new Uint8Array(bytes), contentType };
}

export async function loadWorkspaceSettings(store: DataStore): Promise<WorkspaceSettings> {
  try {
    const raw = await store.getSettings<Partial<WorkspaceSettings>>("workspace");
    return workspaceSettingsSchema.parse({ ...DEFAULT_WORKSPACE, ...raw });
  } catch {
    return { ...DEFAULT_WORKSPACE };
  }
}

/** Resolve tenant from host header for future multi-tenant SaaS routing. */
export function resolveOrgIdFromHost(hostHeader: string | undefined): string {
  const host = (hostHeader || "").split(":")[0].toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".vercel.app")) return DEFAULT_ORG_ID;
  // Future: map customDomain / slug.subdomain → orgId
  return DEFAULT_ORG_ID;
}

export async function uploadBrandingAsset(
  store: DataStore,
  kind: BrandingUploadKind,
  dataUrl: string,
): Promise<CompanySettings> {
  const meta = KIND_FILE[kind];
  const { bytes, contentType } = parseDataUrl(dataUrl);
  const ext = contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png";
  const path = `organizations/${store.orgId}/branding/${meta.file.replace(/\.png$/, `.${ext}`)}`;
  await store.putFile(path, bytes, contentType);
  const company = await store.getSettings<CompanySettings>("company");
  const next: CompanySettings = {
    ...company,
    [meta.field]: path,
    brandingRevision: Date.now(),
  };
  if (kind === "logoDark") {
    next.logoPath = path;
    next.logoDarkPath = path;
  }
  if (kind === "logoLight") next.logoLightPath = path;
  await store.setSettings("company", next);
  return next;
}

export async function resolveAssetToEmbeddable(
  store: DataStore,
  path: string,
): Promise<string> {
  if (!path) return path;
  if (path.startsWith("data:") || path.startsWith("http://") || path.startsWith("https://")) return path;
  if (!isStoredBrandingPath(path)) return path;
  const file = await store.getFile(path);
  if (!file) return path;
  return `data:${file.contentType};base64,${Buffer.from(file.bytes).toString("base64")}`;
}

export async function resolveCompanyAssetsForPdf(
  store: DataStore,
  company: CompanySettings,
  isDark: boolean,
): Promise<{ logo: string; signature: string; seal: string }> {
  const assets = resolveBrandingAssets(company, isDark);
  const [logo, signature, seal] = await Promise.all([
    resolveAssetToEmbeddable(store, assets.logo),
    resolveAssetToEmbeddable(store, assets.signature),
    resolveAssetToEmbeddable(store, assets.seal),
  ]);
  return { logo, signature, seal };
}
