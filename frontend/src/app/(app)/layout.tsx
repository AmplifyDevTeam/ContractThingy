import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionFromCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionFromCookie();
  if (!user) redirect("/login");
  return <AppShell user={user}>{children}</AppShell>;
}
