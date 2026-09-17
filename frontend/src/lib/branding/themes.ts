import type { DocumentTheme } from "@/lib/types";
import type { ThemeId } from "@/lib/types/enums";

export type BrandingTypeMeta = {
  id: ThemeId;
  label: string;
  summary: string;
  useFor: string;
};

/**
 * Lean Amplify letterhead set:
 * - one white/paper theme
 * - one digital dark default
 * - two original designs (Harbor, Ember)
 */
export const AMPLIFY_DOCUMENT_THEMES: DocumentTheme[] = [
  {
    id: "amplify_classic_white",
    name: "Amplify Paper White",
    primaryColor: "#141414",
    accentColor: "#2F5D2A",
    headingFont: "Times New Roman",
    bodyFont: "Georgia",
    background: "light",
    margins: { top: "20mm", right: "18mm", bottom: "20mm", left: "18mm" },
    pageSize: "A4",
    showHeader: true,
    showFooter: true,
    showPageNumbers: true,
    contactFooter: true,
    signatureLayout: "side_by_side",
  },
  {
    id: "amplify_modern_dark",
    name: "Amplify Signal Dark",
    primaryColor: "#0b0c0a",
    accentColor: "#C8E64A",
    headingFont: "Georgia",
    bodyFont: "IBM Plex Sans",
    background: "dark",
    margins: { top: "18mm", right: "16mm", bottom: "18mm", left: "16mm" },
    pageSize: "A4",
    showHeader: true,
    showFooter: true,
    showPageNumbers: true,
    contactFooter: true,
    signatureLayout: "side_by_side",
  },
  {
    id: "amplify_harbor_night",
    name: "Amplify Harbor Night",
    primaryColor: "#07131a",
    accentColor: "#5EEAD4",
    headingFont: "IBM Plex Sans",
    bodyFont: "IBM Plex Sans",
    background: "dark",
    margins: { top: "17mm", right: "15mm", bottom: "17mm", left: "15mm" },
    pageSize: "A4",
    showHeader: true,
    showFooter: true,
    showPageNumbers: true,
    contactFooter: true,
    signatureLayout: "side_by_side",
  },
  {
    id: "amplify_ember_brief",
    name: "Amplify Ember Brief",
    primaryColor: "#1a120c",
    accentColor: "#E8A06A",
    headingFont: "Georgia",
    bodyFont: "IBM Plex Sans",
    background: "dark",
    margins: { top: "16mm", right: "15mm", bottom: "16mm", left: "15mm" },
    pageSize: "Letter",
    showHeader: true,
    showFooter: true,
    showPageNumbers: true,
    contactFooter: true,
    signatureLayout: "stacked",
  },
];

export const BRANDING_TYPE_META: BrandingTypeMeta[] = [
  {
    id: "amplify_classic_white",
    label: "Paper White",
    summary: "The only white letterhead — clean paper field, forest accent, print-ready.",
    useFor: "Employment packets, formal wet-ink style PDFs",
  },
  {
    id: "amplify_modern_dark",
    label: "Signal Dark",
    summary: "Ink field with electric olive — Amplify’s default digital send look.",
    useFor: "Client proposals, internal drafts, screen signing",
  },
  {
    id: "amplify_harbor_night",
    label: "Harbor Night",
    summary: "Deep harbor field with seafoam accent — cool, maritime, precise.",
    useFor: "Service agreements, lead-gen packs, modern clients",
  },
  {
    id: "amplify_ember_brief",
    label: "Ember Brief",
    summary: "Warm charcoal with copper ember accent — compact Letter, stacked signatures.",
    useFor: "US Letter briefs, short client SOWs, amendments",
  },
];

/** Map retired theme ids onto the lean set. */
export const LEGACY_THEME_MAP: Record<string, ThemeId> = {
  amplify_editorial_ink: "amplify_classic_white",
  amplify_olive_formal: "amplify_classic_white",
  amplify_mono_print: "amplify_classic_white",
  amplify_slate_compact: "amplify_ember_brief",
};

export function resolveThemeId(id: string | undefined | null): ThemeId {
  if (!id) return "amplify_modern_dark";
  if ((AMPLIFY_DOCUMENT_THEMES as DocumentTheme[]).some((theme) => theme.id === id)) {
    return id as ThemeId;
  }
  return LEGACY_THEME_MAP[id] ?? "amplify_modern_dark";
}

export function themeById(id: string): DocumentTheme | undefined {
  const resolved = resolveThemeId(id);
  return AMPLIFY_DOCUMENT_THEMES.find((theme) => theme.id === resolved);
}
