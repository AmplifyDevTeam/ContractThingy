import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { getSessionFromCookie } from "@/lib/auth/session";
import type { Permission } from "@/lib/auth/permissions";

const LABELS: Partial<Record<Permission, string>> = {
  "documents.create": "generate documents",
  "documents.approve": "approve documents",
  "people.write": "add or edit people",
  "knowledge.read": "open the knowledge library",
  "signing.manage": "manage signatures",
  "settings.read": "open settings",
};

export default async function NoAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ need?: string }>;
}) {
  const { need } = await searchParams;
  const session = await getSessionFromCookie();
  const action = (need && LABELS[need as Permission]) || "open that page";
  const role = session?.role.replaceAll("_", " ") ?? "your role";

  return (
    <div className="max-w-2xl">
      <PageHeader
        back={{ href: "/dashboard", label: "Dashboard" }}
        kicker="Access"
        title="You don't have access"
        description={`Your role (${role}) can't ${action}. Ask a super admin to change your role in Settings → Users & roles.`}
      />
      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          href="/api/session/refresh?next=/dashboard"
          prefetch={false}
          className="rounded-md bg-primary px-3 py-2 text-primary-foreground"
        >
          I was just promoted — refresh my access
        </Link>
        <Link href="/dashboard" className="rounded-md border border-border px-3 py-2">
          Back to dashboard
        </Link>
      </div>
      {need ? <p className="mt-6 font-mono text-[11px] text-muted-foreground">Missing permission: {need}</p> : null}
    </div>
  );
}
