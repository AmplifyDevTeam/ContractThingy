"use client";

import { BackLink } from "@/components/page-header";

export default function ErrorPage({ error }: { error: Error }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-start justify-center">
      <BackLink href="/dashboard" label="Dashboard" />
      <h1 className="font-display text-3xl tracking-tight">Something went wrong</h1>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground">{error.message}</p>
    </div>
  );
}
