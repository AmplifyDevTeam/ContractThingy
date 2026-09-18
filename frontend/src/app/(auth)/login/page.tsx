import { LoginForm } from "@/components/auth/login-form";
import { BrandMark } from "@/components/brand-mark";
import { LoginEnter } from "@/components/motion/login-enter";
import { ThemeToggle } from "@/components/theme-toggle";
import { apiGet } from "@/lib/api";
import { workspaceLogoUrl } from "@/lib/branding/public-api";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const firebaseEnabled = Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  );

  let displayName = "Amplify";
  let productName = "ContractOS";
  let workspaceName = "Internal workspace";
  let logoSrc: string | undefined;
  let usesCustomLogo = false;
  let logoScale = 3;
  try {
    const branding = await apiGet<{
      displayName: string;
      productName: string;
      workspaceName: string;
      slug?: string;
      logoDark?: string;
      usesCustomLogo?: boolean;
      shellLogoScale?: number;
      brandingRevision?: number;
    }>("/workspace/branding");
    displayName = branding.displayName || displayName;
    productName = branding.productName || productName;
    workspaceName = branding.workspaceName || workspaceName;
    logoSrc = workspaceLogoUrl(
      "dark",
      `${branding.slug ?? ""}-${branding.logoDark ?? ""}-${branding.brandingRevision ?? 0}`,
    );
    usesCustomLogo = Boolean(branding.usesCustomLogo);
    logoScale = branding.shellLogoScale ?? 4;
  } catch {
    /* defaults */
  }

  return (
    <LoginEnter>
      <div className="grid min-h-screen overflow-hidden lg:grid-cols-2">
        <section
          data-login-panel
          className="flex flex-col justify-between border-b border-border px-8 py-8 sm:px-12 sm:py-10 lg:border-r lg:border-b-0"
        >
          <div className="flex items-start justify-between gap-4">
            <BrandMark
              stacked
              name={displayName}
              product={productName}
              logoSrc={logoSrc}
              logoIsWordmark={!usesCustomLogo}
              logoScale={logoScale}
            />
            <ThemeToggle compact />
          </div>
          <div className="max-w-lg py-16 lg:py-0">
            <p className="text-[13px] text-muted-foreground">{workspaceName}</p>
            <h1
              className="font-display mt-5 max-w-[16ch] text-balance leading-[1.12] tracking-tight"
              style={{ fontSize: "clamp(2.25rem, 4.4vw, 3.35rem)" }}
            >
              The contract system for people and companies.
            </h1>
            <p className="mt-6 max-w-[44ch] text-[15px] leading-relaxed text-muted-foreground">
              Approved templates, locked clauses, and a signing trail. Built for the records — not PDF form
              filling.
            </p>
          </div>
          <p className="text-[12px] text-muted-foreground">{productName} workspace</p>
        </section>

        <section
          data-login-panel
          className="relative flex items-center justify-center px-6 py-16 sm:px-12"
          style={{
            background: `
            radial-gradient(120% 80% at 0% 0%, color-mix(in oklab, var(--primary) 14%, var(--background)), transparent 58%),
            linear-gradient(180deg, color-mix(in oklab, var(--primary) 5%, var(--background)), var(--background))
          `,
          }}
        >
          <LoginForm initialError={error} firebaseEnabled={firebaseEnabled} />
        </section>
      </div>
    </LoginEnter>
  );
}
