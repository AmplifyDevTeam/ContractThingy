"use client";

import { useLayoutEffect, type RefObject } from "react";
import gsap from "gsap";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { prefersReducedMotion } from "@/components/motion/reduced-motion";
import { cn } from "@/lib/utils";

export { AnimatedNumber };

export function useDashboardMotion(rootRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const tiles = root.querySelectorAll<HTMLElement>("[data-dash-tile]");
    const bars = root.querySelectorAll<HTMLElement>("[data-dash-bar]");
    const rows = root.querySelectorAll<HTMLElement>("[data-dash-row]");

    if (prefersReducedMotion()) {
      gsap.set([...tiles, ...rows], { clearProps: "all", opacity: 1, y: 0 });
      bars.forEach((bar) => {
        gsap.set(bar, { height: bar.dataset.height ?? "0%" });
      });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.set(tiles, { opacity: 0, y: 18 });
      gsap.set(rows, { opacity: 0, y: 10 });

      bars.forEach((bar) => {
        const target = bar.dataset.height ?? "0%";
        gsap.set(bar, { height: 0 });
        bar.dataset.targetHeight = target;
      });

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.to(tiles, {
        opacity: 1,
        y: 0,
        duration: 0.55,
        stagger: 0.06,
      });

      tl.to(
        bars,
        {
          height: (_i, el) => (el as HTMLElement).dataset.targetHeight ?? "0%",
          duration: 0.85,
          stagger: 0.05,
          ease: "power3.out",
        },
        "-=0.25",
      );

      tl.to(
        rows,
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          stagger: 0.04,
        },
        "-=0.55",
      );
    }, root);

    return () => ctx.revert();
  }, [rootRef]);
}

export function DashTile({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <article data-dash-tile className={cn("flex flex-col rounded-md border border-border bg-card p-6", className)}>
      {children}
    </article>
  );
}
