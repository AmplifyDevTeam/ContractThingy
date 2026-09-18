"use server";

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

export async function createPersonAction(input: unknown) {
  const data = await apiPost<{ person: Person }>("/people", input);
  return data.person;
}

export async function updatePersonAction(input: { id: string } & Record<string, unknown>) {
  const { id, ...patch } = input;
  const data = await apiPatch<{ person: Person }>(`/people/${id}`, patch);
  return data.person;
}

export async function createCompanyAction(input: unknown) {
  const data = await apiPost<{ company: CompanyRecord }>("/companies", input);
  return data.company;
}

export async function previewAction(input: unknown) {
  return apiPost("/generate/preview", input);
}

export async function generateAction(input: unknown) {
  const data = await apiPost<{ document: ContractDocument }>("/generate", input);
  return data.document;
}

export async function approveAction(documentId: string) {
  await apiPost(`/documents/${documentId}/approve`);
}

export async function voidAction(documentId: string, reason: string) {
  await apiPost(`/documents/${documentId}/void`, { reason });
}

export async function sendSignatureAction(documentId: string, recipient?: { name: string; email: string }) {
  return apiPost<SigningLinkResult>(`/documents/${documentId}/send`, recipient ?? {});
}

export async function getSigningLinkAction(documentId: string) {
  const data = await apiGet<{ link: SigningLinkResult | null }>(`/documents/${documentId}/signing-link`);
  if (!data.link) throw new Error("No active signing link");
  return data.link;
}

export async function countersignAction(
  documentId: string,
  imageDataUrl: string,
  method: "draw" | "type",
) {
  await apiPost(`/documents/${documentId}/countersign`, { imageDataUrl, method });
}

export async function recommendAction(input: {
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
    partyType: input.partyType === "client" ? "client" : "employee",
  });
}

export async function saveCompanySettingsAction(input: unknown) {
  return apiPut<CompanySettings>("/settings/company", input);
}

export async function saveWorkspaceSettingsAction(input: unknown) {
  return apiPut<WorkspaceSettings>("/settings/workspace", input);
}

export async function uploadBrandingAssetAction(input: {
  kind: "logoDark" | "logoLight" | "seal" | "signature";
  dataUrl: string;
}) {
  return apiPost<{ company: CompanySettings }>("/settings/branding/upload", input);
}

export async function saveAiSettingsAction(input: unknown) {
  return apiPut<AiSettings>("/settings/ai", input);
}

export async function saveSigningSettingsAction(input: unknown) {
  return apiPut<SigningSettings>("/settings/signing", input);
}

export async function saveEmailSettingsAction(input: unknown) {
  return apiPut<EmailSettings>("/settings/email", input);
}

export async function saveSecuritySettingsAction(input: unknown) {
  return apiPut<SecuritySettings>("/settings/security", input);
}

export async function sendTestEmailAction(to: string) {
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
  }>("/generate/catalog");
}

export async function getDocumentSyncStateAction(documentId: string) {
  return apiGet<{
    status: string;
    signingStatus: string | null;
    recipientSignedAt: string | null;
    lastActivityAt: string;
  }>(`/documents/${documentId}/sync`);
}

export async function updateDocumentThemeAction(documentId: string, themeId: string) {
  const data = await apiPatch<{ document: ContractDocument }>(`/documents/${documentId}/theme`, {
    themeId,
  });
  return data.document;
}

export async function recommendDocumentThemeAction(documentId: string) {
  return apiPost<{
    themeId: ThemeId;
    reason: string;
    source: "ai" | "rules";
    label: string;
  }>(`/documents/${documentId}/theme/recommend`);
}

export async function getDashboardInsightsAction(snapshot: DashboardInsightSnapshot) {
  try {
    return await apiPost<DashboardInsightsResult>("/dashboard/insights", snapshot);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw error;
  }
}
