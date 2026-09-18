import type { CompanySettings, WorkspaceSettings } from "@/lib/types";

export const AMPLIFY_ADDRESS = {
  line1: "House # 948, KRL Road, Babar Colony",
  line2: "Near Rajgan Haveli, Dhoke Gangal",
  city: "Rawalpindi",
  state: "Punjab",
  postalCode: "",
  country: "Pakistan",
};

export const AMPLIFY_COMPANY: CompanySettings = {
  legalName: "Amplify Media",
  displayName: "Amplify Media",
  companyType: "Sole Proprietorship",
  registrationDetails: "A sole proprietorship owned by Basit Gilani",
  ntn: "E675825-6",
  primaryAddress: AMPLIFY_ADDRESS,
  phone: "+92 321 6727983",
  usPhone: "+1 (575) 243-7649",
  email: "basit@amplifymediatechnologies.com",
  website: "https://amplifymediatechnologies.com",
  authorizedSignatory: "Basit Gilani",
  authorizedSignatoryTitle: "CEO",
  productName: "ContractOS",
  logoPath: "/branding/amplify-logo-dark.png",
  logoDarkPath: "/branding/amplify-logo-dark.png",
  logoLightPath: "/branding/amplify-logo-light.png",
  signaturePath: "/branding/signature-basit.png",
  sealPath: "/branding/amplify-seal-light.png",
  defaultThemeId: "amplify_modern_dark",
  defaultJurisdiction: "Pakistan",
  defaultNoticePeriodDays: 30,
  defaultCurrency: "PKR",
  defaultProbationDays: 30,
  defaultWorkMode: "hybrid",
  defaultPageSize: "A4",
};

export const DEFAULT_WORKSPACE: WorkspaceSettings = {
  name: "Amplify Media Technologies",
  slug: "amplify",
  productName: "ContractOS",
  plan: "business",
  status: "active",
  seatLimit: 25,
  shellLogoScale: 4,
};

export function formatCompanyAddress(company: CompanySettings): string {
  const addr = company.primaryAddress;
  return [addr.line1, addr.line2, [addr.city, addr.state].filter(Boolean).join(", "), addr.country]
    .filter(Boolean)
    .join(", ");
}

export function websiteHost(website: string): string {
  return website.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/** Built-in Amplify fallback assets (static `/branding/*`). */
export function brandingAssets(isDark: boolean) {
  return {
    logo: isDark ? "/branding/amplify-logo-dark.png" : "/branding/amplify-logo-light.png",
    signature: isDark ? "/branding/signature-basit.png" : "/branding/signature-basit-ink.png",
    seal: isDark ? "/branding/amplify-seal-dark.png" : "/branding/amplify-seal-light.png",
  };
}

/** Prefer tenant-uploaded paths, then legacy logoPath, then Amplify defaults. */
export function resolveBrandingAssets(company: CompanySettings, isDark: boolean) {
  const defaults = brandingAssets(isDark);
  const logo =
    (isDark ? company.logoDarkPath : company.logoLightPath) ||
    company.logoPath ||
    defaults.logo;
  return {
    logo,
    signature: company.signaturePath || defaults.signature,
    seal: company.sealPath || defaults.seal,
  };
}

export function isStoredBrandingPath(path: string): boolean {
  return Boolean(path) && !path.startsWith("/") && !path.startsWith("data:") && !path.startsWith("http");
}
