"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/components/motion/reduced-motion";

function resetTargets(targets: HTMLElement | HTMLElement[] | NodeListOf<HTMLElement>) {
  gsap.killTweensOf(targets);
  gsap.set(targets, { clearProps: "opacity,transform,y", opacity: 1, y: 0 });
}

/** Login split-screen enter (outside AppShell). */
export function LoginEnter({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;

    const panels = root.querySelectorAll<HTMLElement>("[data-login-panel]");
    const targets = panels.length ? panels : root;

    if (prefersReducedMotion()) {
      resetTargets(targets);
      return;
    }

    const tween = gsap.fromTo(
      targets,
      { opacity: 0, y: panels.length ? 18 : 12 },
      {
        opacity: 1,
        y: 0,
        duration: panels.length ? 0.5 : 0.45,
        stagger: panels.length ? 0.08 : 0,
        ease: "power3.out",
        overwrite: "auto",
        onComplete: () => gsap.set(targets, { clearProps: "opacity,transform,y" }),
      },
    );

    return () => {
      tween.kill();
      resetTargets(targets);
    };
  }, []);

  return <div ref={ref}>{children}</div>;
}
