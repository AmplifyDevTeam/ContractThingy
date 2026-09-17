import gsap from "gsap";
import { flushSync } from "react-dom";
import { prefersReducedMotion } from "@/components/motion/reduced-motion";

type Point = { x: number; y: number };

const TOKEN_KEYS = [
  "background",
  "foreground",
  "card",
  "popover",
  "secondary",
  "muted",
  "muted-foreground",
  "accent",
  "border",
  "input",
  "sidebar",
  "sidebar-foreground",
  "sidebar-accent",
  "primary",
  "ring",
] as const;

type TokenMap = Record<(typeof TOKEN_KEYS)[number], string>;

const LIGHT: TokenMap = {
  background: "#f2f2ee",
  foreground: "#121210",
  card: "#ffffff",
  popover: "#ffffff",
  secondary: "#ebebe6",
  muted: "#ebebe6",
  "muted-foreground": "#6a6964",
  accent: "#e8e9df",
  border: "rgba(18,18,16,0.10)",
  input: "rgba(18,18,16,0.12)",
  sidebar: "#ecece7",
  "sidebar-foreground": "#3a3935",
  "sidebar-accent": "#e2e2dc",
  primary: "#6f7c1f",
  ring: "#6f7c1f",
};

const DARK: TokenMap = {
  background: "#0a0a0a",
  foreground: "#e8e6e1",
  card: "#111111",
  popover: "#141414",
  secondary: "#161616",
  muted: "#161616",
  "muted-foreground": "#8c8984",
  accent: "#161616",
  border: "rgba(255,255,255,0.08)",
  input: "rgba(255,255,255,0.10)",
  sidebar: "#0a0a0a",
  "sidebar-foreground": "#cfcbc4",
  "sidebar-accent": "#161616",
  primary: "#c8d45c",
  ring: "#c8d45c",
};

let activeTween: gsap.core.Tween | null = null;

/** Clear leftover wipe nodes and inline theme overrides. */
export function clearThemeWipes() {
  activeTween?.kill();
  activeTween = null;
  document.querySelectorAll("[data-theme-wipe]").forEach((node) => node.remove());
  const root = document.documentElement;
  root.classList.remove("theme-animating");
  for (const key of TOKEN_KEYS) {
    root.style.removeProperty(`--${key}`);
  }
  root.style.removeProperty("clip-path");
  root.style.removeProperty("filter");
  document.body?.style.removeProperty("filter");
  document.body?.style.removeProperty("opacity");
}

function pointFromEvent(
  event: { clientX?: number; clientY?: number; currentTarget?: EventTarget | null } | null,
): Point {
  if (event?.currentTarget instanceof HTMLElement) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }
  if (event && typeof event.clientX === "number" && typeof event.clientY === "number") {
    return { x: event.clientX, y: event.clientY };
  }
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

function resolveNextIsDark(nextTheme?: "light" | "dark" | "system"): boolean {
  if (nextTheme === "light") return false;
  if (nextTheme === "dark") return true;
  if (nextTheme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return !document.documentElement.classList.contains("dark");
}

function tokensToVars(tokens: TokenMap): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of TOKEN_KEYS) {
    out[`--${key}`] = tokens[key];
  }
  return out;
}

function clearInlineTokens(root: HTMLElement) {
  for (const key of TOKEN_KEYS) {
    root.style.removeProperty(`--${key}`);
  }
}

function pulseControl(event: { currentTarget?: EventTarget | null } | null) {
  const el = event?.currentTarget;
  if (!(el instanceof HTMLElement)) return;
  gsap.fromTo(
    el,
    { scale: 0.92 },
    { scale: 1, duration: 0.45, ease: "power2.out", overwrite: true },
  );
}

/**
 * Morphs palette tokens with GSAP (page stays fully visible) and pulses the control.
 * Origin point is used to bias a soft radial highlight — never clips or covers the UI.
 */
export function runThemeTransition(
  event: { clientX?: number; clientY?: number; currentTarget?: EventTarget | null } | null,
  apply: () => void,
  options?: { nextTheme?: "light" | "dark" | "system" },
): void {
  if (typeof document === "undefined") {
    apply();
    return;
  }

  clearThemeWipes();

  const wasDark = document.documentElement.classList.contains("dark");
  const nextIsDark = resolveNextIsDark(options?.nextTheme);
  const from = wasDark ? DARK : LIGHT;
  const to = nextIsDark ? DARK : LIGHT;

  if (prefersReducedMotion()) {
    flushSync(() => apply());
    return;
  }

  const root = document.documentElement;
  const { x, y } = pointFromEvent(event);

  root.classList.add("theme-animating");

  // Paint starting palette inline, swap theme class, then tween to the destination.
  gsap.set(root, tokensToVars(from));
  flushSync(() => apply());
  pulseControl(event);

  // Soft origin glow (low opacity — cannot blank the page if it lingers).
  const glow = document.createElement("div");
  glow.dataset.themeWipe = "1";
  glow.setAttribute("aria-hidden", "true");
  Object.assign(glow.style, {
    position: "fixed",
    left: `${x}px`,
    top: `${y}px`,
    width: "120px",
    height: "120px",
    marginLeft: "-60px",
    marginTop: "-60px",
    borderRadius: "50%",
    background: to.primary,
    opacity: "0",
    pointerEvents: "none",
    zIndex: "40",
    filter: "blur(28px)",
    transform: "scale(0.4)",
  });
  document.body.appendChild(glow);

  gsap.to(glow, {
    opacity: 0.35,
    scale: 2.2,
    duration: 0.35,
    ease: "power2.out",
    yoyo: true,
    repeat: 1,
    repeatDelay: 0.05,
    onComplete: () => glow.remove(),
  });
  window.setTimeout(() => glow.remove(), 1000);

  const finish = () => {
    clearInlineTokens(root);
    root.classList.remove("theme-animating");
    activeTween = null;
  };

  activeTween = gsap.fromTo(
    root,
    tokensToVars(from),
    {
      ...tokensToVars(to),
      duration: 0.55,
      ease: "power2.inOut",
      onComplete: finish,
      onInterrupt: finish,
    },
  );
}
