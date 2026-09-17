"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/components/motion/reduced-motion";

/** Fade/slide content when `stepKey` changes (wizard steps, signing stages). */
export function StepTransition({
  stepKey,
  children,
  className,
}: {
  stepKey: string | number;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      gsap.set(el, { clearProps: "all", opacity: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" },
      );
    }, el);

    return () => ctx.revert();
  }, [stepKey]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
