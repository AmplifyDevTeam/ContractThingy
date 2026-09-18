"use client";

import { useEffect, useState } from "react";
import { publicApiBase, workspaceLogoUrl } from "@/lib/branding/public-api";

export type ShellBranding = {
  displayName: string;
  productName: string;
  logoSrc: string;
  usesCustomLogo: boolean;
  logoScale: number;
};

type BrandingPayload = {
  displayName?: string;
  productName?: string;
  slug?: string;
  logoDark?: string;
  usesCustomLogo?: boolean;
  shellLogoScale?: number;
  brandingRevision?: number;
};

let memory: ShellBranding | null = null;
let inflight: Promise<ShellBranding | null> | null = null;
const listeners = new Set<() => void>();

function mapBranding(data: BrandingPayload): ShellBranding {
  return {
    displayName: data.displayName || "Amplify",
    productName: data.productName || "ContractOS",
    logoSrc: workspaceLogoUrl(
      "dark",
      `${data.slug ?? ""}-${data.logoDark ?? ""}-${data.brandingRevision ?? 0}`,
    ),
    usesCustomLogo: Boolean(data.usesCustomLogo),
    logoScale: data.shellLogoScale ?? 4,
  };
}

async function fetchBranding(): Promise<ShellBranding | null> {
  try {
    const res = await fetch(`${publicApiBase()}/workspace/branding`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    return mapBranding((await res.json()) as BrandingPayload);
  } catch {
    return null;
  }
}

/** Shared across soft navigations so the shell doesn't re-hit branding every route. */
export function loadShellBranding(force = false): Promise<ShellBranding | null> {
  if (!force && memory) return Promise.resolve(memory);
  if (!force && inflight) return inflight;
  inflight = fetchBranding().then((next) => {
    if (next) memory = next;
    inflight = null;
    return next;
  });
  return inflight;
}

export function clearShellBrandingCache() {
  memory = null;
  inflight = null;
  for (const listener of listeners) listener();
}

export function useShellBranding() {
  const [branding, setBranding] = useState<ShellBranding | null>(memory);

  useEffect(() => {
    let cancelled = false;

    const pull = (force = false) => {
      void loadShellBranding(force).then((next) => {
        if (!cancelled && next) setBranding(next);
      });
    };

    pull(false);
    const onInvalidate = () => pull(true);
    listeners.add(onInvalidate);
    return () => {
      cancelled = true;
      listeners.delete(onInvalidate);
    };
  }, []);

  return branding;
}
