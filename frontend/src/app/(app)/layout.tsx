import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSession, getSessionFromCookie } from "@/lib/auth/session";
import { apiGet } from "@/lib/api";
import { workspaceLogoUrl } from "@/lib/branding/public-api";

export const dynamic = "force-dynamic";

type WorkspaceBranding = {
  displayName: string;
  productName: string;
  usesCustomLogo?: boolean;
  slug?: string;
  logoDark?: string;
  shellLogoScale?: number;
  brandingRevision?: number;
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let user = await getSessionFromCookie();
  if (!user) redirect("/login");

  // Cookie can lag behind DB promotions (e.g. still VIEWER). Refresh once when needed.
  if (user.role === "VIEWER") {
    user = (await getSession()) ?? user;
    if (!user) redirect("/login");
  }

  let branding:
    | {
        displayName: string;
        productName: string;
        logoSrc: string;
        usesCustomLogo: boolean;
        logoScale: number;
      }
    | undefined;
  try {
    const data = await apiGet<WorkspaceBranding>("/workspace/branding");
    branding = {
      displayName: data.displayName || "Amplify",
      productName: data.productName || "ContractOS",
      logoSrc: workspaceLogoUrl(
        "dark",
        `${data.slug ?? ""}-${data.logoDark ?? ""}-${data.brandingRevision ?? 0}`,
      ),
      usesCustomLogo: Boolean(data.usesCustomLogo),
      logoScale: data.shellLogoScale ?? 4,
    };
  } catch {
    branding = undefined;
  }

  return (
    <AppShell user={user} branding={branding}>
      {children}
    </AppShell>
  );
}
