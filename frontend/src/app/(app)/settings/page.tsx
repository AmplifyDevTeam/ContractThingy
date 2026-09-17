import { PageHeader } from "@/components/page-header";
import { SettingsPanels } from "@/components/settings/settings-panels";
import { requirePermission } from "@/lib/auth/session";
import { apiGet } from "@/lib/api";
import type { AiSettings, AiUsage, CompanySettings, DocumentTheme, EmailSettings, SecuritySettings, SigningSettings } from "@/lib/types";
import type { PublicOrgUser } from "@/lib/users-public";

export default async function SettingsPage() {
  const session = await requirePermission("settings.read");
  const data = await apiGet<{
    company: CompanySettings;
    ai: AiSettings;
    aiUsage: AiUsage;
    signing: SigningSettings;
    themes: DocumentTheme[];
    email: EmailSettings;
    security: SecuritySettings;
    emailTransport: {
      provider: "resend" | "console";
      configured: boolean;
      from: string;
    };
    securityStatus: {
      sessionSecretConfigured: boolean;
      production: boolean;
      secureCookies: boolean;
      dataAdapter: "local" | "firestore";
      firebaseConfigured: boolean;
    };
    aiConfigured: boolean;
    users: PublicOrgUser[];
    canManageUsers: boolean;
  }>("/settings");

  return (
    <div>
      <PageHeader
        back={{ href: "/dashboard", label: "Dashboard" }}
        kicker="Admin"
        title="Settings"
        description="Company identity, signing defaults, email transport, and optional AI."
      />
      <SettingsPanels
        company={data.company}
        ai={data.ai}
        usage={data.aiUsage}
        signing={data.signing}
        emailSettings={data.email}
        securitySettings={data.security}
        security={data.securityStatus}
        users={data.users}
        email={data.emailTransport}
        aiConfigured={data.aiConfigured}
        themes={data.themes}
        canManageUsers={data.canManageUsers}
        currentUserId={session.userId}
      />
    </div>
  );
}
