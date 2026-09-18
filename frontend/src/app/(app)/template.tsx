"use client";

import { PageEnter } from "@/components/motion/page-enter";

/** Remounts on every navigation so GSAP page/reveal enters run on real content. */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <PageEnter>{children}</PageEnter>;
}
