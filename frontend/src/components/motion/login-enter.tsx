"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/components/motion/reduced-motion";

/** Login split-screen enter (outside AppShell). */
export function LoginEnter({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;

    const panels = root.querySelectorAll<HTMLElement>("[data-login-panel]");
    if (prefersReducedMotion()) {
      gsap.set(panels.length ? panels : root, { clearProps: "all", opacity: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      if (panels.length) {
        gsap.fromTo(
          panels,
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: "power3.out" },
        );
      } else {
        gsap.fromTo(root, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" });
      }
    }, root);

    return () => ctx.revert();
  }, []);

  return <div ref={ref}>{children}</div>;
}
