"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/components/motion/reduced-motion";

function resetMotion(el: HTMLElement) {
  gsap.killTweensOf(el);
  gsap.set(el, { clearProps: "opacity,transform,y", opacity: 1, y: 0 });
}

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
      resetMotion(el);
      return;
    }

    const tween = gsap.fromTo(
      el,
      { opacity: 0, y: 14 },
      {
        opacity: 1,
        y: 0,
        duration: 0.35,
        ease: "power3.out",
        overwrite: "auto",
        onComplete: () => gsap.set(el, { clearProps: "opacity,transform,y" }),
      },
    );

    return () => {
      tween.kill();
      resetMotion(el);
    };
  }, [stepKey]);

  return (
    <div ref={ref} className={className} suppressHydrationWarning>
      {children}
    </div>
  );
}
