"use client";

import { useLayoutEffect, type RefObject } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/components/motion/reduced-motion";

/** Animate `[data-reveal]` tiles and `[data-reveal-row]` rows inside a root. */
export function useReveal(rootRef: RefObject<HTMLElement | null>, deps: unknown[] = []) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const tiles = root.querySelectorAll<HTMLElement>("[data-reveal]");
    const rows = root.querySelectorAll<HTMLElement>("[data-reveal-row]");

    if (tiles.length === 0 && rows.length === 0) return;

    if (prefersReducedMotion()) {
      gsap.set([...tiles, ...rows], { clearProps: "all", opacity: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      if (tiles.length) gsap.set(tiles, { opacity: 0, y: 16 });
      if (rows.length) gsap.set(rows, { opacity: 0, y: 10 });

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      if (tiles.length) {
        tl.to(tiles, {
          opacity: 1,
          y: 0,
          duration: 0.45,
          stagger: 0.05,
        });
      }
      if (rows.length) {
        tl.to(
          rows,
          {
            opacity: 1,
            y: 0,
            duration: 0.35,
            stagger: 0.035,
          },
          tiles.length ? "-=0.25" : 0,
        );
      }
    }, root);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller controls replay via deps
  }, deps);
}
