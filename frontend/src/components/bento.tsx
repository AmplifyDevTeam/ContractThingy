import Link from "next/link";
import { Reveal } from "@/components/motion/reveal-bound";
import { cn } from "@/lib/utils";

export function Bento({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("grid grid-cols-1 gap-3 md:grid-cols-3", className)}>{children}</div>;
}

export function Tile({
  kicker,
  action,
  href,
  span = 1,
  rowSpan,
  pad = true,
  className,
  children,
}: {
  kicker?: string;
  action?: React.ReactNode;
  href?: string;
  span?: 1 | 2 | 3;
  rowSpan?: 1 | 2;
  pad?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const classes = cn(
    "flex h-full flex-col rounded-md border border-border bg-card",
    pad && "p-6",
    span === 2 && "md:col-span-2",
    span === 3 && "md:col-span-3",
    rowSpan === 2 && "md:row-span-2",
    href && "transition-colors hover:bg-muted/60",
    className,
  );
  const body = (
    <>
      {kicker || action ? (
        <div className={cn("flex items-baseline justify-between gap-3", !pad && "px-6 pt-6")}>
          {kicker ? <p className="text-[12px] text-muted-foreground">{kicker}</p> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </>
  );
  if (href) {
    return (
      <Reveal as={Link} href={href} className={classes}>
        {body}
      </Reveal>
    );
  }
  return (
    <Reveal as="article" className={classes}>
      {body}
    </Reveal>
  );
}

export function Stat({
  value,
  label,
  hint,
  size = "lg",
}: {
  value: React.ReactNode;
  label?: string;
  hint?: string;
  size?: "lg" | "md";
}) {
  return (
    <>
      <p
        className={cn(
          "font-display mt-4 leading-none tracking-tight",
          size === "lg" ? "text-[3.25rem]" : "text-[2.5rem]",
        )}
      >
        {value}
      </p>
      {label ? <p className="mt-2 text-sm text-muted-foreground">{label}</p> : null}
      {hint ? <p className="mt-3 text-sm text-muted-foreground">{hint}</p> : null}
    </>
  );
}

export function MetaList({ rows }: { rows: Array<[string, React.ReactNode]> }) {
  return (
    <dl className="mt-5 space-y-2 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="text-right">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function TileLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-mono text-[11px] text-muted-foreground hover:text-foreground">
      {children}
    </Link>
  );
}
