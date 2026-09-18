import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Reveal, RevealRow } from "@/components/motion/reveal-bound";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-5 inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-[12px] text-muted-foreground hover:border-foreground/20 hover:bg-muted hover:text-foreground"
    >
      <ChevronLeft className="size-3.5 shrink-0 opacity-70" aria-hidden />
      <span>
        Back to <span className="text-foreground/80">{label}</span>
      </span>
    </Link>
  );
}

export function PageHeader({
  kicker,
  title,
  description,
  actions,
  back,
}: {
  index?: string;
  kicker?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <Reveal className="mb-8">
      {back ? <BackLink href={back.href} label={back.label} /> : null}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 max-w-2xl">
          {kicker ? <p className="text-[13px] text-muted-foreground">{kicker}</p> : null}
          <h1 className="font-display mt-1 text-[2.15rem] leading-[1.15] tracking-tight text-foreground sm:text-[2.45rem]">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </Reveal>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Reveal className="flex flex-col items-start gap-3 rounded-md border border-dashed border-border px-6 py-16">
      <h2 className="font-display text-2xl tracking-tight">{title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      {action}
    </Reveal>
  );
}

export function EntityLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-medium hover:text-primary">
      {children}
    </Link>
  );
}

export function IndexRow({
  href,
  n,
  title,
  meta,
  trailing,
}: {
  href: string;
  n?: string;
  title: string;
  meta?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <RevealRow
      href={href}
      className="group grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-baseline gap-4 border-b border-border py-4 first:border-t"
    >
      {n ? <span className="font-mono text-[11px] text-muted-foreground">{n}</span> : <span />}
      <span>
        <span className="block text-[15px] leading-snug font-medium transition-colors group-hover:text-primary">
          {title}
        </span>
        {meta ? <span className="mt-1 block text-[13px] text-muted-foreground">{meta}</span> : null}
      </span>
      {trailing ? <span className="self-center">{trailing}</span> : null}
    </RevealRow>
  );
}
