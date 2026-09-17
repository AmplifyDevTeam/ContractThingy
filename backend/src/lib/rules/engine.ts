import type { RuleCondition, RuleGroup } from "@/lib/validation/schemas";

function getByPath(source: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    if (typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, source);
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return undefined;
}

function asString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

export function evaluateCondition(
  condition: RuleCondition,
  context: Record<string, unknown>,
): boolean {
  const actual = getByPath(context, condition.field);
  const expected = condition.value;

  switch (condition.operator) {
    case "exists":
      return actual !== undefined && actual !== null && actual !== "";
    case "not_exists":
      return actual === undefined || actual === null || actual === "";
    case "equals":
      return actual === expected;
    case "not_equals":
      return actual !== expected;
    case "greater_than": {
      const a = asNumber(actual);
      const b = asNumber(expected);
      return a !== undefined && b !== undefined && a > b;
    }
    case "less_than": {
      const a = asNumber(actual);
      const b = asNumber(expected);
      return a !== undefined && b !== undefined && a < b;
    }
    case "greater_than_or_equal": {
      const a = asNumber(actual);
      const b = asNumber(expected);
      return a !== undefined && b !== undefined && a >= b;
    }
    case "less_than_or_equal": {
      const a = asNumber(actual);
      const b = asNumber(expected);
      return a !== undefined && b !== undefined && a <= b;
    }
    case "contains":
      return asString(actual).toLowerCase().includes(asString(expected).toLowerCase());
    case "not_contains":
      return !asString(actual).toLowerCase().includes(asString(expected).toLowerCase());
    case "in":
      return Array.isArray(expected) && expected.some((item) => item === actual);
    case "not_in":
      return Array.isArray(expected) && !expected.some((item) => item === actual);
    default:
      return false;
  }
}

export function isRuleGroup(value: RuleCondition | RuleGroup): value is RuleGroup {
  return "combinator" in value && "conditions" in value;
}

export function evaluateRuleGroup(
  group: RuleGroup | undefined,
  context: Record<string, unknown>,
): boolean {
  if (!group || group.conditions.length === 0) return true;
  const results = group.conditions.map((item) =>
    isRuleGroup(item) ? evaluateRuleGroup(item, context) : evaluateCondition(item, context),
  );
  return group.combinator === "AND" ? results.every(Boolean) : results.some(Boolean);
}

export type EvaluatedActions = {
  includeClauseIds: Set<string>;
  excludeClauseIds: Set<string>;
  includeSectionIds: Set<string>;
  excludeSectionIds: Set<string>;
  recommendedTemplateIds: string[];
  recommendedClauseIds: string[];
  fieldOverrides: Record<string, unknown>;
};

export function evaluateRules(
  rules: Array<{ id: string; when: RuleGroup; then: Array<{
    type: string;
    clauseId?: string;
    sectionId?: string;
    templateId?: string;
    field?: string;
    value?: unknown;
  }> }>,
  context: Record<string, unknown>,
): EvaluatedActions {
  const result: EvaluatedActions = {
    includeClauseIds: new Set(),
    excludeClauseIds: new Set(),
    includeSectionIds: new Set(),
    excludeSectionIds: new Set(),
    recommendedTemplateIds: [],
    recommendedClauseIds: [],
    fieldOverrides: {},
  };

  for (const rule of rules) {
    if (!evaluateRuleGroup(rule.when, context)) continue;
    for (const action of rule.then) {
      switch (action.type) {
        case "include_clause":
          if (action.clauseId) result.includeClauseIds.add(action.clauseId);
          break;
        case "exclude_clause":
          if (action.clauseId) result.excludeClauseIds.add(action.clauseId);
          break;
        case "include_section":
          if (action.sectionId) result.includeSectionIds.add(action.sectionId);
          break;
        case "exclude_section":
          if (action.sectionId) result.excludeSectionIds.add(action.sectionId);
          break;
        case "recommend_template":
          if (action.templateId) result.recommendedTemplateIds.push(action.templateId);
          break;
        case "recommend_clause":
          if (action.clauseId) result.recommendedClauseIds.push(action.clauseId);
          break;
        case "set_field":
          if (action.field) result.fieldOverrides[action.field] = action.value;
          break;
      }
    }
  }

  return result;
}

export function recommendDocumentType(input: {
  partyType: string;
  action: string;
  hasExistingEmploymentAgreement: boolean;
  historicalTemplateId?: string;
  historicalReason?: string;
}): { templateId: string; reason: string } {
  const { partyType, action, hasExistingEmploymentAgreement, historicalTemplateId, historicalReason } = input;
  const isClientParty = partyType === "client" || partyType === "company";

  if (partyType === "employee" && action === "promote" && hasExistingEmploymentAgreement) {
    return {
      templateId: "tpl_promotion_amended",
      reason:
        "An existing employment agreement exists and the employment relationship is being modified rather than recreated.",
    };
  }
  if (partyType === "employee" && action === "change_salary" && hasExistingEmploymentAgreement) {
    return {
      templateId: "tpl_promotion_amended",
      reason: "Salary changes should amend the existing employment agreement.",
    };
  }
  if (partyType === "employee" && action === "amend_agreement") {
    return {
      templateId: "tpl_promotion_amended",
      reason: "Amendments should reference and modify the original employment agreement.",
    };
  }
  if (partyType === "employee" && action === "generate_nda") {
    return {
      templateId: "tpl_employment_standard",
      reason: "NDA language is available as approved clauses on the employment family.",
    };
  }
  if (!isClientParty && historicalTemplateId) {
    return {
      templateId: historicalTemplateId,
      reason: historicalReason ?? "This person’s historical agreement is the starting point.",
    };
  }
  if (partyType === "employee" && (action === "hire" || action === "custom")) {
    return {
      templateId: "tpl_employment_standard",
      reason: "A new employment relationship should start from the approved Standard Employment Agreement.",
    };
  }
  if (partyType === "contractor") {
    return {
      templateId: "tpl_employment_standard",
      reason: "Contractor engagements use the contractor clause set on the employment family until a dedicated contractor template is selected.",
    };
  }
  if (isClientParty && action === "new_lead_generation") {
    return {
      templateId: "tpl_lead_generation",
      reason: "Most Amplify client work starts from the approved Lead Generation Agreement.",
    };
  }
  if (isClientParty && action === "new_collaboration") {
    return {
      templateId: "tpl_collaboration",
      reason: "Inbound-call and affiliate partnerships use the approved Collaboration Agreement.",
    };
  }
  if (isClientParty && action === "new_media_buying") {
    return {
      templateId: "tpl_media_buying",
      reason: "Paid media management is a distinct engagement from lead generation.",
    };
  }
  if (isClientParty && action === "new_service_agreement") {
    return {
      templateId: "tpl_service_agreement",
      reason: "General client work that is not lead generation or media buying uses the Service Agreement.",
    };
  }
  if (isClientParty && (action === "renew" || action === "amend_services" || action === "change_pricing" || action === "custom")) {
    if (historicalTemplateId) {
      return {
        templateId: historicalTemplateId,
        reason: historicalReason ?? "This client’s historical agreement is the starting point.",
      };
    }
    return {
      templateId: "tpl_lead_generation",
      reason: "Lead-generation and pricing terms are handled through the Lead Generation Agreement family.",
    };
  }
  if (isClientParty) {
    if (historicalTemplateId) {
      return {
        templateId: historicalTemplateId,
        reason: historicalReason ?? "Client documents follow this client’s historical agreement type.",
      };
    }
    return {
      templateId: "tpl_lead_generation",
      reason: "Client documents default to the approved Lead Generation Agreement.",
    };
  }

  return {
    templateId: "tpl_employment_standard",
    reason: "Defaulting to the Standard Employment Agreement based on selected party and action.",
  };
}
