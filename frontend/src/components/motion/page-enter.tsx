"use client";

import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { prefersReducedMotion } from "@/components/motion/reduced-motion";
import { useReveal } from "@/components/motion/reveal";

function resetMotion(el: HTMLElement) {
  gsap.killTweensOf(el);
  gsap.set(el, { clearProps: "opacity,transform,y", opacity: 1, y: 0 });
}

/** Route-level enter + stagger for `[data-reveal]` / `[data-reveal-row]` inside main content. */
export function PageEnter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (prefersReducedMotion()) {
      resetMotion(root);
      return;
    }

    const tween = gsap.fromTo(
      root,
      { opacity: 0, y: 12 },
      {
        opacity: 1,
        y: 0,
        duration: 0.4,
        ease: "power3.out",
        overwrite: "auto",
        onComplete: () => gsap.set(root, { clearProps: "opacity,transform,y" }),
      },
    );

    return () => {
      tween.kill();
      resetMotion(root);
    };
  }, [pathname]);

  useReveal(rootRef, [pathname]);

  return (
    <div ref={rootRef} className="min-h-0" suppressHydrationWarning>
      {children}
    </div>
  );
}
