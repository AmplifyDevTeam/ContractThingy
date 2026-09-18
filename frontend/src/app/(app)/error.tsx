"use client";

import { BackLink } from "@/components/page-header";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-start justify-center gap-4">
      <BackLink href="/dashboard" label="Dashboard" />
      <h1 className="font-display text-3xl tracking-tight">Something went wrong</h1>
      <p className="max-w-xl text-sm text-muted-foreground">{error.message}</p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
          onClick={() => reset()}
        >
          Try again
        </button>
        <a href="/dashboard" className="rounded-md border border-border px-3 py-2 text-sm">
          Hard reload dashboard
        </a>
      </div>
    </div>
  );
}
