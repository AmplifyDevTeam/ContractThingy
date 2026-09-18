"use client";

import type { ReactNode } from "react";

/** Route content wrapper — keep interactive; avoid GSAP opacity that can stick at 0. */
export function PageEnter({ children }: { children: ReactNode }) {
  return <div className="min-h-0">{children}</div>;
}
