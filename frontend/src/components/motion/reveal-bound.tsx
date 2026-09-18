"use client";

import Link from "next/link";
import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "@/lib/utils";

type RevealProps<T extends ElementType> = {
  as?: T;
  className?: string;
  children?: React.ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

/** Client boundary for GSAP `[data-reveal]` — owns the node React hydrates. */
export function Reveal<T extends ElementType = "div">({
  as,
  className,
  children,
  ...rest
}: RevealProps<T>) {
  const Comp = (as ?? "div") as ElementType;
  return (
    <Comp data-reveal className={className} suppressHydrationWarning {...rest}>
      {children}
    </Comp>
  );
}

/** Client boundary for GSAP `[data-reveal-row]`. */
export function RevealRow({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} data-reveal-row className={cn(className)} suppressHydrationWarning>
      {children}
    </Link>
  );
}
