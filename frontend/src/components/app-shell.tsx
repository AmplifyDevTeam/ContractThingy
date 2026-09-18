"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { PageEnter } from "@/components/motion/page-enter";
import { NavProgress } from "@/components/nav-progress";
import { ThemeToggle } from "@/components/theme-toggle";
import { logoutAction } from "@/lib/actions/auth";
import { getClientAuth } from "@/lib/firebase/client";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth/session";
import { signOut } from "firebase/auth";

const GROUPS = [
  {
    label: "Workspace",
    items: [
      { n: "01", href: "/dashboard", label: "Dashboard" },
      { n: "02", href: "/documents", label: "Documents" },
      { n: "03", href: "/generate", label: "Generate" },
    ],
  },
  {
    label: "Records",
    items: [
      { n: "04", href: "/people", label: "People" },
      { n: "05", href: "/companies", label: "Clients" },
    ],
  },
  {
    label: "Library",
    items: [
      { n: "06", href: "/templates", label: "Templates" },
      { n: "07", href: "/clauses", label: "Clauses" },
      { n: "08", href: "/packs", label: "Packs" },
      { n: "09", href: "/knowledge", label: "Knowledge" },
    ],
  },
  {
    label: "Control",
    items: [
      { n: "10", href: "/signatures", label: "Signatures" },
      { n: "11", href: "/approvals", label: "Approvals" },
      { n: "12", href: "/audit", label: "Audit" },
      { n: "13", href: "/settings", label: "Settings" },
    ],
  },
];

const FLAT = GROUPS.flatMap((group) => group.items);

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const current = FLAT.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  return (
    <div className="min-h-screen bg-background lg:grid lg:h-dvh lg:grid-cols-[12rem_minmax(0,1fr)] lg:overflow-hidden">
      <NavProgress />
      <aside className="hidden h-full min-h-0 flex-col overflow-hidden overscroll-none border-r border-border px-4 py-6 lg:flex">
        <Link href="/dashboard" className="block shrink-0">
          <BrandMark />
        </Link>
        <nav
          aria-label="Primary"
          className="mt-10 min-h-0 flex-1 space-y-7 overflow-y-auto overscroll-contain"
        >
          {GROUPS.map((group) => (
            <div key={group.label}>
              <div className="mb-2 text-[11px] text-muted-foreground">{group.label}</div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch
                      className={cn(
                        "group flex items-baseline gap-3 border-l-2 border-transparent py-1.5 pl-3 text-[14px] text-muted-foreground transition-colors hover:text-foreground",
                        active && "border-primary text-foreground",
                      )}
                    >
                      <span className="font-mono text-[10px] text-muted-foreground/80">{item.n}</span>
                      <span className="transition-transform duration-200 group-hover:translate-x-0.5">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="shrink-0 border-t border-border pt-4">
          <div className="truncate text-[13px]">{user.displayName}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">{user.role.replaceAll("_", " ")}</div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <form
              action={async () => {
                const auth = getClientAuth();
                if (auth) {
                  try {
                    await signOut(auth);
                  } catch {
                    /* ignore */
                  }
                }
                await logoutAction();
              }}
            >
              <button type="submit" className="text-[12px] text-muted-foreground hover:text-foreground">
                Sign out
              </button>
            </form>
            <ThemeToggle compact />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col lg:min-h-0 lg:overflow-hidden">
        <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 lg:hidden">
          <BrandMark />
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-muted-foreground">{current?.label ?? "Workspace"}</span>
            <ThemeToggle compact />
          </div>
        </header>
        <div className="flex gap-3 overflow-x-auto border-b border-border px-4 py-2.5 lg:hidden">
          {FLAT.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={cn(
                "shrink-0 text-[12px] text-muted-foreground",
                (pathname === item.href || pathname.startsWith(`${item.href}/`)) && "text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="hidden shrink-0 items-center justify-between border-b border-border px-8 py-3.5 lg:flex">
          <span className="font-display text-[1.15rem] tracking-tight">{current?.label ?? "Workspace"}</span>
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-muted-foreground">Amplify Media · Internal</span>
            <ThemeToggle compact />
          </div>
        </div>
        <main className="flex-1 px-4 py-8 sm:px-6 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:px-10 lg:py-9">
          <PageEnter>{children}</PageEnter>
        </main>
      </div>
    </div>
  );
}
