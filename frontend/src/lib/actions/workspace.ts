"use server";

import { toResult } from "@/lib/actions/result";

import { apiGet, apiPatch, apiPost, apiPut, ApiError } from "@/lib/api";
import type { DashboardInsightSnapshot, DashboardInsightsResult } from "@/lib/dashboard/insights";
import type { ThemeId } from "@/lib/types/enums";
import type {
  Person,
  CompanyRecord,
  ContractDocument,
  AiSettings,
  SigningSettings,
  EmailSettings,
  SecuritySettings,
  Template,
  TemplateVersion,
  Clause,
  ClauseVersion,
  DocumentTheme,
  RoleProfile,
  SourceDocument,
  CompanySettings,
  WorkspaceSettings,
} from "@/lib/types";

export type SigningLinkResult = {
  url: string;
  recipientEmail: string;
  recipientName: string;
  emailDelivered: boolean;
  emailProvider: "resend" | "console";
};

async function createPersonAction__impl(input: unknown) {
  const data = await apiPost<{ person: Person }>("/people", input);
  return data.person;
}

async function updatePersonAction__impl(input: { id: string } & Record<string, unknown>) {
  const { id, ...patch } = input;
  const data = await apiPatch<{ person: Person }>(`/people/${id}`, patch);
  return data.person;
}

async function createCompanyAction__impl(input: unknown) {
  const data = await apiPost<{ company: CompanyRecord }>("/companies", input);
  return data.company;
}

async function previewAction__impl(input: unknown) {
  return apiPost("/generate/preview", input);
}

async function generateAction__impl(input: unknown) {
  const data = await apiPost<{ document: ContractDocument }>("/generate", input);
  return data.document;
}

async function approveAction__impl(documentId: string) {
  await apiPost(`/documents/${documentId}/approve`);
}

async function voidAction__impl(documentId: string, reason: string) {
  await apiPost(`/documents/${documentId}/void`, { reason });
}

async function sendSignatureAction__impl(documentId: string, recipient?: { name: string; email: string }) {
  return apiPost<SigningLinkResult>(`/documents/${documentId}/send`, recipient ?? {});
}

async function getSigningLinkAction__impl(documentId: string) {
  const data = await apiGet<{ link: SigningLinkResult | null }>(`/documents/${documentId}/signing-link`);
  if (!data.link) throw new Error("No active signing link");
  return data.link;
}

async function revokeSigningLinkAction__impl(requestId: string) {
  await apiPost(`/signing/${requestId}/revoke`);
}

async function extendSigningLinkAction__impl(requestId: string, days: number) {
  await apiPost(`/signing/${requestId}/extend`, { days });
}

async function countersignAction__impl(
  documentId: string,
  imageDataUrl: string,
  method: "draw" | "type",
) {
  await apiPost(`/documents/${documentId}/countersign`, { imageDataUrl, method });
}

async function recommendAction__impl(input: {
  partyType: string;
  action: string;
  personId?: string;
  companyId?: string;
  jobTitle?: string;
}) {
  return apiPost<{
    templateId: string;
    reason: string;
    ai?: { templateId?: string; reason: string } | null;
  }>("/generate/recommend", {
    ...input,
    partyType: input.partyType === "client" || input.partyType === "company" ? "client" : "employee",
  });
}

async function saveCompanySettingsAction__impl(input: unknown) {
  return apiPut<CompanySettings>("/settings/company", input);
}

async function saveWorkspaceSettingsAction__impl(input: unknown) {
  return apiPut<WorkspaceSettings>("/settings/workspace", input);
}

async function uploadBrandingAssetAction__impl(input: {
  kind: "logoDark" | "logoLight" | "seal" | "signature";
  dataUrl: string;
}) {
  return apiPost<{ company: CompanySettings }>("/settings/branding/upload", input);
}

async function saveAiSettingsAction__impl(input: unknown) {
  return apiPut<AiSettings>("/settings/ai", input);
}

async function saveSigningSettingsAction__impl(input: unknown) {
  return apiPut<SigningSettings>("/settings/signing", input);
}

async function saveEmailSettingsAction__impl(input: unknown) {
  return apiPut<EmailSettings>("/settings/email", input);
}

async function saveSecuritySettingsAction__impl(input: unknown) {
  return apiPut<SecuritySettings>("/settings/security", input);
}

async function sendTestEmailAction__impl(to: string) {
  return apiPost<{ ok: true; delivered: boolean; provider: "resend" | "console" }>(
    "/settings/email/test",
    { to },
  );
}

export async function loadGenerateCatalog() {
  return apiGet<{
    people: Person[];
    companies: CompanyRecord[];
    templates: Template[];
    templateVersions: TemplateVersion[];
    clauses: Clause[];
    clauseVersions: ClauseVersion[];
    themes: DocumentTheme[];
    roleProfiles: RoleProfile[];
    documents: ContractDocument[];
    sources: SourceDocument[];
    company: CompanySettings;
    aiEnabled: boolean;
  }>("/generate/catalog");
}

async function getDocumentSyncStateAction__impl(documentId: string) {
  return apiGet<{
    status: string;
    signingStatus: string | null;
    recipientSignedAt: string | null;
    lastActivityAt: string;
  }>(`/documents/${documentId}/sync`);
}

async function updateDocumentThemeAction__impl(documentId: string, themeId: string) {
  const data = await apiPatch<{ document: ContractDocument }>(`/documents/${documentId}/theme`, {
    themeId,
  });
  return data.document;
}

async function recommendDocumentThemeAction__impl(documentId: string) {
  return apiPost<{
    themeId: ThemeId;
    reason: string;
    source: "ai" | "rules";
    label: string;
  }>(`/documents/${documentId}/theme/recommend`);
}

async function getDashboardInsightsAction__impl(snapshot: DashboardInsightSnapshot) {
  try {
    return await apiPost<DashboardInsightsResult>("/dashboard/insights", snapshot);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw error;
  }
}

// ── Public actions (return ActionResult; see lib/actions/result.ts) ──
export async function createPersonAction(...args: Parameters<typeof createPersonAction__impl>) {
  return toResult(() => createPersonAction__impl(...args));
}
export async function updatePersonAction(...args: Parameters<typeof updatePersonAction__impl>) {
  return toResult(() => updatePersonAction__impl(...args));
}
export async function createCompanyAction(...args: Parameters<typeof createCompanyAction__impl>) {
  return toResult(() => createCompanyAction__impl(...args));
}
export async function previewAction(...args: Parameters<typeof previewAction__impl>) {
  return toResult(() => previewAction__impl(...args));
}
export async function generateAction(...args: Parameters<typeof generateAction__impl>) {
  return toResult(() => generateAction__impl(...args));
}
export async function approveAction(...args: Parameters<typeof approveAction__impl>) {
  return toResult(() => approveAction__impl(...args));
}
export async function voidAction(...args: Parameters<typeof voidAction__impl>) {
  return toResult(() => voidAction__impl(...args));
}
export async function sendSignatureAction(...args: Parameters<typeof sendSignatureAction__impl>) {
  return toResult(() => sendSignatureAction__impl(...args));
}
export async function getSigningLinkAction(...args: Parameters<typeof getSigningLinkAction__impl>) {
  return toResult(() => getSigningLinkAction__impl(...args));
}
export async function revokeSigningLinkAction(...args: Parameters<typeof revokeSigningLinkAction__impl>) {
  return toResult(() => revokeSigningLinkAction__impl(...args));
}
export async function extendSigningLinkAction(...args: Parameters<typeof extendSigningLinkAction__impl>) {
  return toResult(() => extendSigningLinkAction__impl(...args));
}
export async function countersignAction(...args: Parameters<typeof countersignAction__impl>) {
  return toResult(() => countersignAction__impl(...args));
}
export async function recommendAction(...args: Parameters<typeof recommendAction__impl>) {
  return toResult(() => recommendAction__impl(...args));
}
export async function saveCompanySettingsAction(...args: Parameters<typeof saveCompanySettingsAction__impl>) {
  return toResult(() => saveCompanySettingsAction__impl(...args));
}
export async function saveWorkspaceSettingsAction(...args: Parameters<typeof saveWorkspaceSettingsAction__impl>) {
  return toResult(() => saveWorkspaceSettingsAction__impl(...args));
}
export async function uploadBrandingAssetAction(...args: Parameters<typeof uploadBrandingAssetAction__impl>) {
  return toResult(() => uploadBrandingAssetAction__impl(...args));
}
export async function saveAiSettingsAction(...args: Parameters<typeof saveAiSettingsAction__impl>) {
  return toResult(() => saveAiSettingsAction__impl(...args));
}
export async function saveSigningSettingsAction(...args: Parameters<typeof saveSigningSettingsAction__impl>) {
  return toResult(() => saveSigningSettingsAction__impl(...args));
}
export async function saveEmailSettingsAction(...args: Parameters<typeof saveEmailSettingsAction__impl>) {
  return toResult(() => saveEmailSettingsAction__impl(...args));
}
export async function saveSecuritySettingsAction(...args: Parameters<typeof saveSecuritySettingsAction__impl>) {
  return toResult(() => saveSecuritySettingsAction__impl(...args));
}
export async function sendTestEmailAction(...args: Parameters<typeof sendTestEmailAction__impl>) {
  return toResult(() => sendTestEmailAction__impl(...args));
}
export async function getDocumentSyncStateAction(...args: Parameters<typeof getDocumentSyncStateAction__impl>) {
  return toResult(() => getDocumentSyncStateAction__impl(...args));
}
export async function updateDocumentThemeAction(...args: Parameters<typeof updateDocumentThemeAction__impl>) {
  return toResult(() => updateDocumentThemeAction__impl(...args));
}
export async function recommendDocumentThemeAction(...args: Parameters<typeof recommendDocumentThemeAction__impl>) {
  return toResult(() => recommendDocumentThemeAction__impl(...args));
}
export async function getDashboardInsightsAction(...args: Parameters<typeof getDashboardInsightsAction__impl>) {
  return toResult(() => getDashboardInsightsAction__impl(...args));
}
