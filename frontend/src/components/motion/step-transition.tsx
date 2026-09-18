"use client";

import type { ReactNode } from "react";

/** Wizard/signing step wrapper — no opacity animation (avoids stuck non-interactive UI). */
export function StepTransition({
  stepKey: _stepKey,
  children,
  className,
}: {
  stepKey: string | number;
  children: ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}
