import { cn } from "@/lib/utils";

export type BrandMarkProps = {
  /** Larger lockup for login / marketing panels. */
  stacked?: boolean;
  name?: string;
  product?: string;
  logoSrc?: string | null;
  /** True when logo already includes the company name (default Amplify assets). */
  logoIsWordmark?: boolean;
  /** Dense sidebar/header mark — avoids wide wordmark dead space. */
  compact?: boolean;
  /** Custom logo mark size: 1 (smallest) – 5 (largest). */
  logoScale?: number;
  className?: string;
};

function splitName(name: string): { primary: string; secondary?: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return { primary: name };
  return { primary: parts[0]!, secondary: parts.slice(1).join(" ") };
}

function clampScale(scale?: number) {
  if (scale == null || Number.isNaN(scale)) return 4;
  return Math.min(5, Math.max(1, Math.round(scale)));
}

/** Max height for uploaded logos at each scale step (width fills the rail). */
export function shellLogoHeight(scale?: number, compact = true) {
  const s = clampScale(scale);
  const compactHeights = [36, 44, 56, 68, 84] as const;
  const wideHeights = [44, 56, 68, 84, 104] as const;
  return (compact ? compactHeights : wideHeights)[s - 1]!;
}

/**
 * Shell / login brand lockup.
 * Custom uploads fill the rail width and scale with logoScale.
 * Built-in Amplify assets stay typographic in the narrow sidebar.
 */
export function BrandMark({
  stacked = false,
  name = "Amplify",
  product = "ContractOS",
  logoSrc,
  logoIsWordmark = true,
  compact = false,
  logoScale = 4,
  className,
}: BrandMarkProps) {
  const { primary, secondary } = splitName(name);
  const scale = clampScale(logoScale);
  const markH = shellLogoHeight(scale, compact);

  // Custom upload — width-first so aspect ratio drives size (no tiny padded speck).
  if (logoSrc && !logoIsWordmark) {
    if (compact) {
      return (
        <div className={cn("min-w-0 w-full", className)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt={name}
            className="block h-auto w-full object-contain object-left"
            style={{ maxHeight: markH }}
          />
          <p className="mt-2.5 font-mono text-[10px] leading-none tracking-[0.16em] text-muted-foreground uppercase">
            {product}
          </p>
        </div>
      );
    }

    const wideH = shellLogoHeight(scale, false);
    return (
      <div className={cn("min-w-0", stacked ? "w-full max-w-[16rem]" : "w-full max-w-[14rem]", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt={name}
          className="block h-auto w-full object-contain object-left"
          style={{ maxHeight: wideH }}
        />
        <p className="mt-2.5 font-mono text-[10px] leading-none tracking-[0.16em] text-muted-foreground uppercase">
          {product}
        </p>
      </div>
    );
  }

  // Sidebar / mobile: typographic mark when using default Amplify assets
  if (compact) {
    return (
      <div className={cn("min-w-0", className)}>
        <div className="font-display text-[1.25rem] leading-none tracking-tight text-foreground">
          {primary}
        </div>
        {secondary ? (
          <div className="mt-1 text-[11px] font-semibold tracking-[0.12em] text-primary uppercase">
            {secondary}
          </div>
        ) : null}
        <p className="mt-2 font-mono text-[10px] leading-none tracking-[0.16em] text-muted-foreground uppercase">
          {product}
        </p>
      </div>
    );
  }

  // Login / wide panels: full built-in wordmark when present
  if (logoSrc && logoIsWordmark) {
    const maxH = stacked ? 28 + scale * 10 : 24 + scale * 8;
    return (
      <div className={cn("w-full max-w-[13rem]", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt={name}
          className="h-auto w-full object-contain object-left"
          style={{ maxHeight: maxH }}
        />
        <p className="mt-2.5 font-mono text-[10px] leading-none tracking-[0.16em] text-muted-foreground uppercase">
          {product}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("min-w-0", stacked && "space-y-1", className)}>
      <div className="font-display text-[1.35rem] leading-none tracking-tight text-foreground">{primary}</div>
      {secondary ? (
        <div className="mt-1 text-[11px] font-semibold tracking-[0.12em] text-primary uppercase">
          {secondary}
        </div>
      ) : null}
      <p className="mt-2 font-mono text-[10px] leading-none tracking-[0.16em] text-muted-foreground uppercase">
        {product}
      </p>
    </div>
  );
}
