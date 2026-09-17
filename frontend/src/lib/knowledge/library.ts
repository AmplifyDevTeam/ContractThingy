import type { DocumentAction } from "@/lib/types/enums";
import type { SourceDocument } from "@/lib/types";

export type SourceAnalysis = {
  family: "CLIENT" | "EMPLOYMENT";
  companyId?: string;
  personId?: string;
  title: string;
  partyName: string;
  summary: string;
  monthlyFee: string;
  verticals: string[];
  role?: string;
  recommendedTemplateId: string;
  recommendedAction: DocumentAction | string;
  patterns: string[];
};

export const TYPE_LABELS: Record<string, string> = {
  lead_generation_agreement: "Lead generation",
  collaboration_agreement: "Collaboration",
  marketing_agreement: "Media buying",
  service_agreement: "Service agreement",
  employment_standard: "Employment",
  employment_appointment_setter: "Appointment setter",
  employment_executive: "Executive employment",
  internship_agreement: "Internship",
  promotion_amended_employment: "Promotion amendment",
  salary_amendment: "Salary amendment",
};

export const TYPE_TO_TEMPLATE: Record<string, string> = {
  lead_generation_agreement: "tpl_lead_generation",
  collaboration_agreement: "tpl_collaboration",
  marketing_agreement: "tpl_media_buying",
  service_agreement: "tpl_service_agreement",
  employment_standard: "tpl_employment_standard",
  employment_appointment_setter: "tpl_employment_appointment_setter",
  employment_executive: "tpl_employment_standard",
  internship_agreement: "tpl_employment_standard",
  promotion_amended_employment: "tpl_promotion_amended",
  salary_amendment: "tpl_promotion_amended",
};

export function readSourceAnalysis(doc: SourceDocument): SourceAnalysis | null {
  const raw = doc.analysisJson;
  if (!raw) return null;
  const family = raw.family === "EMPLOYMENT" || typeof raw.personId === "string" ? "EMPLOYMENT" : "CLIENT";
  const compensation = String(raw.compensation ?? raw.monthlyFee ?? "");
  return {
    family,
    companyId: typeof raw.companyId === "string" ? raw.companyId : undefined,
    personId: typeof raw.personId === "string" ? raw.personId : undefined,
    title: String(raw.title ?? TYPE_LABELS[doc.detectedType ?? ""] ?? "Agreement"),
    partyName: String(raw.partyName ?? raw.clientName ?? ""),
    summary: String(raw.summary ?? ""),
    monthlyFee: compensation,
    verticals: Array.isArray(raw.verticals) ? raw.verticals.map(String) : [],
    role: typeof raw.role === "string" ? raw.role : undefined,
    recommendedTemplateId: String(raw.recommendedTemplateId ?? TYPE_TO_TEMPLATE[doc.detectedType ?? ""] ?? ""),
    recommendedAction: String(raw.recommendedAction ?? "hire"),
    patterns: Array.isArray(raw.patterns) ? raw.patterns.map(String) : [],
  };
}

export function sourcesForCompany(sources: SourceDocument[], companyId: string) {
  return sources
    .filter((item) => readSourceAnalysis(item)?.companyId === companyId)
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export function sourcesForPerson(sources: SourceDocument[], personId: string) {
  return sources
    .filter((item) => readSourceAnalysis(item)?.personId === personId)
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export function recommendFromClientHistory(sources: SourceDocument[], companyId: string) {
  const latest = sourcesForCompany(sources, companyId)[0];
  if (!latest) return null;
  const analysis = readSourceAnalysis(latest);
  if (!analysis) return null;
  return {
    templateId: analysis.recommendedTemplateId,
    action: analysis.recommendedAction as DocumentAction,
    reason: `This client’s historical ${analysis.title.toLowerCase()} is the starting point for a new agreement.`,
    source: latest,
    analysis,
  };
}

export function recommendFromPersonHistory(sources: SourceDocument[], personId: string) {
  const latest = sourcesForPerson(sources, personId)[0];
  if (!latest) return null;
  const analysis = readSourceAnalysis(latest);
  if (!analysis) return null;
  return {
    templateId: analysis.recommendedTemplateId || "tpl_employment_standard",
    action: (analysis.recommendedAction as DocumentAction) || "hire",
    reason: `This person’s historical ${analysis.title.toLowerCase()} is the starting point.`,
    source: latest,
    analysis,
  };
}
