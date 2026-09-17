import { geminiEnabled } from "@/lib/config";
import type { DataStore } from "@/lib/data/store";
import type { AiSettings, AiUsage, Clause, Template } from "@/lib/types";

export type SourceAnalysis = {
  documentType: string;
  documentSubtype?: string;
  parties: Record<string, unknown>;
  employment?: Record<string, unknown>;
  compensation?: Record<string, unknown>;
  probation?: Record<string, unknown>;
  clauses: Array<{ type: string; confidence: number }>;
  suggestedTemplate?: string;
  confidence: number;
  unusualClauses?: string[];
};

export interface ContractAIService {
  analyzeSourceDocument(input: { text: string; fileName: string }): Promise<SourceAnalysis>;
  recommendTemplate(input: {
    partyType: string;
    action: string;
    hasExistingEmploymentAgreement: boolean;
    jobTitle?: string;
  }): Promise<{ templateId: string; reason: string }>;
  recommendClauses(input: {
    templateId: string;
    variables: Record<string, unknown>;
  }): Promise<{ clauseIds: string[]; reason: string }>;
  recommendTheme(input: {
    family: string;
    documentType: string;
    partyType: string;
    partyName: string;
    action: string;
    currentThemeId?: string;
    themes: Array<{ id: string; name: string; background: string; pageSize: string; useFor: string }>;
  }): Promise<{ themeId: string; reason: string }>;
  extractDocumentFields(input: { text: string }): Promise<Record<string, unknown>>;
  summarizeDocument(input: { html: string }): Promise<string>;
  compareDocuments(input: { left: string; right: string }): Promise<string>;
  dashboardInsights(input: {
    snapshot: Record<string, unknown>;
  }): Promise<{
    headline: string;
    insights: Array<{ title: string; detail: string; tone: "urgent" | "watch" | "ok"; href?: string }>;
  }>;
}

class DisabledAIService implements ContractAIService {
  async analyzeSourceDocument(): Promise<SourceAnalysis> {
    throw new AIDisabledError();
  }
  async recommendTemplate(): Promise<{ templateId: string; reason: string }> {
    throw new AIDisabledError();
  }
  async recommendClauses(): Promise<{ clauseIds: string[]; reason: string }> {
    throw new AIDisabledError();
  }
  async recommendTheme(): Promise<{ themeId: string; reason: string }> {
    throw new AIDisabledError();
  }
  async extractDocumentFields(): Promise<Record<string, unknown>> {
    throw new AIDisabledError();
  }
  async summarizeDocument(): Promise<string> {
    throw new AIDisabledError();
  }
  async compareDocuments(): Promise<string> {
    throw new AIDisabledError();
  }
  async dashboardInsights(): Promise<{
    headline: string;
    insights: Array<{ title: string; detail: string; tone: "urgent" | "watch" | "ok"; href?: string }>;
  }> {
    throw new AIDisabledError();
  }
}

function geminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}

function parseJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Gemini returned non-JSON output");
  }
}

class GeminiContractService implements ContractAIService {
  constructor(private apiKey: string) {}

  private async complete(system: string, user: string): Promise<string> {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const client = new GoogleGenerativeAI(this.apiKey);
    const model = client.getGenerativeModel({
      model: geminiModel(),
      systemInstruction: system,
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
      },
    });
    const result = await model.generateContent(user);
    const text = result.response.text();
    if (!text?.trim()) throw new Error("Gemini returned an empty response");
    return text;
  }

  async analyzeSourceDocument(input: { text: string; fileName: string }): Promise<SourceAnalysis> {
    const raw = await this.complete(
      "You extract structured contract metadata. Return JSON only matching the requested schema. Never invent approved legal wording.",
      `File: ${input.fileName}\n\n${input.text.slice(0, 24000)}`,
    );
    return parseJsonObject(raw) as SourceAnalysis;
  }

  async recommendTemplate(input: {
    partyType: string;
    action: string;
    hasExistingEmploymentAgreement: boolean;
    jobTitle?: string;
  }) {
    const raw = await this.complete(
      "Recommend an existing Amplify template id from: tpl_employment_standard, tpl_employment_appointment_setter, tpl_promotion_amended, tpl_service_agreement, tpl_lead_generation. Return JSON {templateId, reason}. Do not draft legal text.",
      JSON.stringify(input),
    );
    return parseJsonObject(raw) as { templateId: string; reason: string };
  }

  async recommendClauses(input: { templateId: string; variables: Record<string, unknown> }) {
    const raw = await this.complete(
      "Recommend existing clause ids only. Return JSON {clauseIds:string[], reason:string}. Never create new legal wording.",
      JSON.stringify(input),
    );
    return parseJsonObject(raw) as { clauseIds: string[]; reason: string };
  }

  async recommendTheme(input: {
    family: string;
    documentType: string;
    partyType: string;
    partyName: string;
    action: string;
    currentThemeId?: string;
    themes: Array<{ id: string; name: string; background: string; pageSize: string; useFor: string }>;
  }) {
    const ids = input.themes.map((theme) => theme.id).join(", ");
    const raw = await this.complete(
      `You pick ONE Amplify PDF letterhead theme id from this closed list only: ${ids}. Return JSON {themeId, reason}. Guide: amplify_classic_white = only white/paper print theme (employment, formal); amplify_modern_dark = digital olive on ink; amplify_harbor_night = cool seafoam on harbor dark (client service); amplify_ember_brief = warm copper on charcoal Letter (short US briefs). Never invent themes or legal text.`,
      JSON.stringify(input),
    );
    const parsed = parseJsonObject(raw) as { themeId?: string; reason?: string };
    const themeId = input.themes.some((theme) => theme.id === parsed.themeId)
      ? (parsed.themeId as string)
      : input.themes[0]?.id;
    return {
      themeId: themeId ?? "amplify_modern_dark",
      reason: parsed.reason?.trim() || "Best match from Amplify’s predefined letterhead set.",
    };
  }

  async extractDocumentFields(input: { text: string }) {
    const raw = await this.complete(
      "Extract fields as JSON. Keys may include jobTitle, compensation, probation, jurisdiction, parties.",
      input.text.slice(0, 20000),
    );
    return parseJsonObject(raw) as Record<string, unknown>;
  }

  async summarizeDocument(input: { html: string }) {
    const raw = await this.complete(
      "Summarize the agreement in JSON {summary:string}. Do not rewrite clauses.",
      input.html.replace(/<[^>]+>/g, " ").slice(0, 12000),
    );
    const parsed = parseJsonObject(raw) as { summary?: string };
    return parsed.summary ?? "";
  }

  async compareDocuments(input: { left: string; right: string }) {
    const raw = await this.complete(
      "Summarize differences in JSON {summary:string}. Deterministic diffs are handled separately.",
      JSON.stringify({
        left: input.left.replace(/<[^>]+>/g, " ").slice(0, 8000),
        right: input.right.replace(/<[^>]+>/g, " ").slice(0, 8000),
      }),
    );
    const parsed = parseJsonObject(raw) as { summary?: string };
    return parsed.summary ?? "";
  }

  async dashboardInsights(input: { snapshot: Record<string, unknown> }) {
    const raw = await this.complete(
      `You are an ops assistant for Amplify ContractOS. Given workspace metrics JSON, return JSON only:
{headline:string, insights:[{title:string, detail:string, tone:"urgent"|"watch"|"ok", href?:string}]}
Rules: 3 to 4 insights max. Be concrete and actionable for contracts/signing/people/clients. href may only be one of /documents, /generate, /people, /companies, /signatures, /knowledge, /approvals. Never invent legal wording, clause text, or private party facts not in the snapshot. Prefer blocked work and expiring signatures first.`,
      JSON.stringify(input.snapshot),
    );
    const parsed = parseJsonObject(raw) as {
      headline?: string;
      insights?: Array<{ title?: string; detail?: string; tone?: string; href?: string }>;
    };
    const allowedHrefs = new Set([
      "/documents",
      "/generate",
      "/people",
      "/companies",
      "/signatures",
      "/knowledge",
      "/approvals",
    ]);
    const tones = new Set(["urgent", "watch", "ok"]);
    const insights = (parsed.insights ?? [])
      .filter((item) => item.title?.trim() && item.detail?.trim())
      .slice(0, 4)
      .map((item) => ({
        title: String(item.title).trim(),
        detail: String(item.detail).trim(),
        tone: (tones.has(String(item.tone)) ? item.tone : "watch") as "urgent" | "watch" | "ok",
        href: item.href && allowedHrefs.has(item.href) ? item.href : undefined,
      }));
    return {
      headline: parsed.headline?.trim() || "Workspace pulse",
      insights,
    };
  }
}

export class AIDisabledError extends Error {
  constructor(message = "AI assistance is disabled") {
    super(message);
    this.name = "AIDisabledError";
  }
}

export type AiCapability =
  | "analyzeUploads"
  | "recommendTemplates"
  | "recommendClauses"
  | "recommendThemes"
  | "extractFields"
  | "compareDocuments"
  | "generateSummaries"
  | "dashboardInsights";

function createLiveService(): ContractAIService {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return new DisabledAIService();
  return new GeminiContractService(key);
}

export async function getContractAIService(store?: DataStore): Promise<ContractAIService> {
  if (!geminiEnabled()) return new DisabledAIService();
  if (store) {
    const settings = await store.getSettings<AiSettings>("ai");
    if (!settings?.enabled) return new DisabledAIService();
  }
  return createLiveService();
}

/** Gate a specific assistance feature. Master switch + API key + per-feature flag. */
export async function requireAiCapability(
  store: DataStore,
  capability: AiCapability,
): Promise<ContractAIService> {
  if (!geminiEnabled()) throw new AIDisabledError("GEMINI_API_KEY is not configured");
  const settings = await store.getSettings<AiSettings>("ai");
  if (!settings?.enabled) throw new AIDisabledError();
  if (!settings[capability]) throw new AIDisabledError(`AI capability disabled: ${capability}`);
  if (settings.draftNewClauses) {
    // Defense in depth — drafting new legal text is never allowed.
    throw new AIDisabledError("Drafting new legal clauses is not permitted");
  }
  const usage = await store.getSettings<AiUsage>("aiUsage");
  if (usage.estimatedCostUsd >= settings.hardSpendingLimitUsd) {
    throw new Error("AI hard spending limit reached");
  }
  return createLiveService();
}

export async function recordAiUsage(
  store: DataStore,
  usage: { inputTokens: number; outputTokens: number; costUsd: number },
) {
  const current = await store.getSettings<AiUsage>("aiUsage");
  const settings = await store.getSettings<AiSettings>("ai");
  const next: AiUsage = {
    ...current,
    inputTokens: current.inputTokens + usage.inputTokens,
    outputTokens: current.outputTokens + usage.outputTokens,
    estimatedCostUsd: Number((current.estimatedCostUsd + usage.costUsd).toFixed(4)),
    requests: current.requests + 1,
  };
  if (next.estimatedCostUsd > settings.hardSpendingLimitUsd) {
    throw new Error("AI hard spending limit reached");
  }
  await store.setSettings("aiUsage", next);
}

export function clauseCatalogForPrompt(clauses: Clause[], templates: Template[]) {
  return {
    clauseIds: clauses.map((item) => ({ id: item.id, title: item.title })),
    templateIds: templates.map((item) => ({ id: item.id, name: item.name })),
  };
}
