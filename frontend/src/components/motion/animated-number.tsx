"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/components/motion/reduced-motion";
import { cn } from "@/lib/utils";

export function AnimatedNumber({
  value,
  className,
  duration = 1.15,
  delay = 0,
  suffix = "",
}: {
  value: number;
  className?: string;
  duration?: number;
  delay?: number;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      el.textContent = `${Math.round(value)}${suffix}`;
      return;
    }

    const state = { n: 0 };
    const tween = gsap.to(state, {
      n: value,
      duration,
      delay,
      ease: "power2.out",
      onUpdate: () => {
        el.textContent = `${Math.round(state.n)}${suffix}`;
      },
    });
    return () => {
      tween.kill();
    };
  }, [value, duration, delay, suffix]);

  return (
    <span ref={ref} className={cn(className)}>
      0{suffix}
    </span>
  );
}
