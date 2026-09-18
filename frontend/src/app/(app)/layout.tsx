import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSession, getSessionFromCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let user = await getSessionFromCookie();
  if (!user) redirect("/login");

  // Cookie can lag behind DB promotions (e.g. still VIEWER). Refresh once when needed.
  if (user.role === "VIEWER") {
    user = (await getSession()) ?? user;
    if (!user) redirect("/login");
  }

  // Branding loads client-side (cached across soft nav) so layout isn't blocked on an API hop.
  return <AppShell user={user}>{children}</AppShell>;
}
