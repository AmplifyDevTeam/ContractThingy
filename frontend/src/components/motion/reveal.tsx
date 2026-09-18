"use client";

import { useLayoutEffect, type RefObject } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/components/motion/reduced-motion";

function resetTargets(targets: HTMLElement[]) {
  if (!targets.length) return;
  gsap.killTweensOf(targets);
  gsap.set(targets, { clearProps: "opacity,transform,y", opacity: 1, y: 0 });
}

/** Animate `[data-reveal]` tiles and `[data-reveal-row]` rows inside a root. */
export function useReveal(rootRef: RefObject<HTMLElement | null>, deps: unknown[] = []) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const tiles = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    const rows = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal-row]"));
    const all = [...tiles, ...rows];

    if (all.length === 0) return;

    if (prefersReducedMotion()) {
      resetTargets(all);
      return;
    }

    if (tiles.length) gsap.set(tiles, { opacity: 0, y: 16 });
    if (rows.length) gsap.set(rows, { opacity: 0, y: 10 });

    const tl = gsap.timeline({
      defaults: { ease: "power3.out" },
      onComplete: () => gsap.set(all, { clearProps: "opacity,transform,y" }),
    });

    if (tiles.length) {
      tl.to(tiles, {
        opacity: 1,
        y: 0,
        duration: 0.45,
        stagger: 0.05,
        overwrite: "auto",
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
          overwrite: "auto",
        },
        tiles.length ? "-=0.25" : 0,
      );
    }

    return () => {
      tl.kill();
      resetTargets(all);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller controls replay via deps
  }, deps);
}
