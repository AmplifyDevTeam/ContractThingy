import { brandingAssets, formatCompanyAddress, websiteHost } from "@/lib/branding/identity";
import { evaluateRuleGroup, evaluateRules } from "@/lib/rules/engine";
import { interpolate } from "@/lib/render/interpolate";
import type {
  Clause,
  ClauseVersion,
  CompanySettings,
  ContractDocument,
  DocumentTheme,
  Person,
  Template,
  TemplateVersion,
} from "@/lib/types";

export type AssembleInput = {
  template: Template;
  templateVersion: TemplateVersion;
  clauses: Clause[];
  clauseVersions: ClauseVersion[];
  theme: DocumentTheme;
  company: CompanySettings;
  person?: Person | null;
  client?: {
    legalName: string;
    displayName: string;
    email: string;
    primaryContact: string;
    jurisdiction?: string;
  } | null;
  variables: Record<string, unknown>;
  enabledOptionalClauseIds?: string[];
  disabledClauseIds?: string[];
  documentId?: string;
  readableId?: string;
  signatures?: {
    recipient?: { name: string; imageDataUrl?: string; signedAt?: string };
    company?: { name: string; imageDataUrl?: string; signedAt?: string };
  };
  auditCertificate?: {
    createdAt: string;
    sentAt?: string;
    viewedAt?: string;
    consentAt?: string;
    recipientSignedAt?: string;
    companySignedAt?: string;
    finalizedAt?: string;
    sha256?: string;
    recipientName?: string;
    recipientEmail?: string;
  };
};

export type AssembledDocument = {
  html: string;
  bodyHtml: string;
  includedSectionIds: string[];
  includedClauseIds: string[];
  clauseVersionIds: string[];
  context: Record<string, unknown>;
};

function clauseMap(clauses: Clause[]): Map<string, Clause> {
  return new Map(clauses.map((clause) => [clause.id, clause]));
}

function versionForClause(
  clause: Clause,
  versions: ClauseVersion[],
): ClauseVersion | undefined {
  return (
    versions.find((version) => version.id === clause.currentVersionId) ??
    versions
      .filter((version) => version.clauseId === clause.id && version.status === "approved")
      .sort((a, b) => b.version - a.version)[0]
  );
}

export function assembleDocument(input: AssembleInput): AssembledDocument {
  const {
    template,
    templateVersion,
    clauses,
    clauseVersions,
    theme,
    company,
    person,
    client,
    variables,
    enabledOptionalClauseIds = [],
    disabledClauseIds = [],
    documentId,
    readableId,
    signatures,
    auditCertificate,
  } = input;

  const context: Record<string, unknown> = {
    ...variables,
    document: {
      id: readableId ?? documentId ?? "DRAFT",
      name: template.name,
      type: template.documentType,
      effectiveDate: (variables.startDate as string | undefined) ?? new Date().toISOString().slice(0, 10),
    },
    company: {
      name: company.legalName,
      legalName: company.legalName,
      displayName: company.displayName,
      address: company.primaryAddress,
      phone: company.phone,
      email: company.email,
      website: company.website,
      authorizedSignatory: company.authorizedSignatory,
      authorizedSignatoryTitle: company.authorizedSignatoryTitle,
      ntn: company.ntn,
    },
    person: person ?? {},
    client: client ?? {},
    employeeLevel:
      typeof variables.employeeLevel === "string"
        ? variables.employeeLevel
        : person?.currentJobTitle?.toLowerCase().includes("chief") ||
            person?.currentJobTitle?.toLowerCase().includes("director")
          ? "executive"
          : "standard",
  };

  const evaluated = evaluateRules(templateVersion.rules, context);
  const clausesById = clauseMap(clauses);
  const includedSectionIds: string[] = [];
  const includedClauseIds: string[] = [];
  const usedClauseVersionIds: string[] = [];
  const sectionsHtml: string[] = [];
  let sectionNumber = 0;

  const sortedSections = [...templateVersion.sections].sort((a, b) => a.order - b.order);

  for (const section of sortedSections) {
    if (evaluated.excludeSectionIds.has(section.id)) continue;
    if (section.includeWhen && !evaluateRuleGroup(section.includeWhen, context)) continue;
    if (section.optional && !evaluated.includeSectionIds.has(section.id) && !section.required) {
      const hasForcedClause = section.clauseIds.some((id) => evaluated.includeClauseIds.has(id));
      if (!hasForcedClause) continue;
    }

    const clauseHtml: string[] = [];
    for (const clauseId of section.clauseIds) {
      if (disabledClauseIds.includes(clauseId)) continue;
      if (evaluated.excludeClauseIds.has(clauseId)) continue;
      const clause = clausesById.get(clauseId);
      if (!clause) continue;
      if (clause.status === "optional" && !enabledOptionalClauseIds.includes(clauseId) && !evaluated.includeClauseIds.has(clauseId)) {
        continue;
      }
      const version = versionForClause(clause, clauseVersions);
      if (!version || version.status === "archived") continue;
      if (version.conditions && !evaluateRuleGroup(version.conditions, context)) continue;

      includedClauseIds.push(clause.id);
      usedClauseVersionIds.push(version.id);
      clauseHtml.push(
        `<div class="clause" data-clause-id="${clause.id}" data-clause-version="${version.id}">${interpolate(version.legalText, context)}</div>`,
      );
    }

    if (clauseHtml.length === 0 && !section.required) continue;
    sectionNumber += 1;
    includedSectionIds.push(section.id);
    const padded = String(sectionNumber).padStart(2, "0");
    const [leadClause, ...restClauses] = clauseHtml;
    sectionsHtml.push(`
      <section class="doc-section" id="${section.id}">
        <div class="section-lead">
          <h2><span class="section-num">${padded}</span> ${section.title}</h2>
          ${leadClause ?? ""}
        </div>
        ${restClauses.join("\n")}
      </section>
    `);
  }

  const bodyHtml = sectionsHtml.join("\n");
  const html = wrapDocumentHtml({
    theme,
    company,
    template,
    readableId: readableId ?? "DRAFT",
    partyName: person?.fullLegalName ?? client?.legalName ?? "Party",
    partyKind: person ? "employee" : client ? "client" : "party",
    bodyHtml,
    signatures,
    auditCertificate,
  });

  return {
    html,
    bodyHtml,
    includedSectionIds,
    includedClauseIds,
    clauseVersionIds: usedClauseVersionIds,
    context,
  };
}

export function wrapDocumentHtml(args: {
  theme: DocumentTheme;
  company: CompanySettings;
  template: Template | Pick<ContractDocument, "name">;
  readableId: string;
  partyName: string;
  partyKind?: "employee" | "client" | "party";
  bodyHtml: string;
  signatures?: AssembleInput["signatures"];
  auditCertificate?: AssembleInput["auditCertificate"];
}): string {
  const {
    theme,
    company,
    template,
    readableId,
    partyName,
    partyKind = "party",
    bodyHtml,
    signatures,
    auditCertificate,
  } = args;
  const isDark = theme.background === "dark";
  const title = template.name;
  const assets = brandingAssets(isDark);
  const signatureBlock = renderSignatures(
    theme,
    company,
    partyName,
    partyKind,
    signatures,
    assets.signature,
    company.sealPath || assets.seal,
  );
  const certificate = auditCertificate ? renderAuditCertificate(auditCertificate, readableId, title, partyName) : "";
  const address = formatCompanyAddress(company);
  const partyLabel = partyKind === "employee" ? "Employee" : partyKind === "client" ? "Client" : "Counterparty";
  const companyLabel = partyKind === "employee" ? "Employer" : "Service Provider";
  const host = websiteHost(company.website);
  const footerBits = [company.usPhone, company.phone, company.email, host].filter(Boolean);
  const footerText = footerBits.join(" · ");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title} — ${readableId}</title>
  <style>${documentCss(theme, isDark)}</style>
</head>
<body class="${isDark ? "theme-dark" : "theme-light"}"${theme.showFooter ? ` data-pdf-footer="${footerText}" data-pdf-accent="${theme.accentColor}"` : ""}>
  <div class="pdf-bleed" aria-hidden="true"></div>
  <div class="page">
    ${theme.showHeader ? `<header class="doc-header">
      <img class="brand-logo" src="${assets.logo}" alt="${company.displayName}" />
      <div class="header-meta">
        <div class="doc-id">${readableId}</div>
      </div>
    </header>` : ""}
    <h1 class="doc-title">${title}</h1>
    <div class="parties">
      <div class="party">
        <div class="party-label">${companyLabel}</div>
        <div class="party-name">${company.legalName}</div>
        <p>${company.registrationDetails}</p>
        <p>${address}</p>
        ${company.ntn ? `<p>NTN: ${company.ntn}</p>` : ""}
        <p>${company.email} · ${host}</p>
      </div>
      <div class="party">
        <div class="party-label">${partyLabel}</div>
        <div class="party-name">${partyName}</div>
      </div>
    </div>
    ${bodyHtml}
    ${signatureBlock}
    ${theme.showFooter ? `<footer class="doc-footer">
      <span>${footerText}</span>
      ${theme.showPageNumbers ? `<span class="page-num"></span>` : ""}
    </footer>` : ""}
  </div>
  ${certificate}
</body>
</html>`;
}

function renderSignatures(
  theme: DocumentTheme,
  company: CompanySettings,
  partyName: string,
  partyKind: "employee" | "client" | "party",
  signatures: AssembleInput["signatures"] | undefined,
  defaultCompanySignature: string,
  sealSrc: string,
): string {
  const layout = theme.signatureLayout === "stacked" ? "stacked" : "side";
  const recipientSig = signatures?.recipient?.imageDataUrl
    ? `<img class="sig-img" src="${signatures.recipient.imageDataUrl}" alt="Recipient signature" />`
    : `<div class="sig-line"></div>`;
  const companyImage = signatures?.company?.imageDataUrl ?? defaultCompanySignature;
  const companySig = `<img class="sig-img" src="${companyImage}" alt="${company.authorizedSignatory} signature" />`;
  const recipientLabel = partyKind === "employee" ? "Employee" : partyKind === "client" ? "Client" : "Recipient";

  return `
    <section class="doc-section signatures ${layout}">
      <div class="section-lead">
        <h2>Signatures</h2>
        <p>IN WITNESS WHEREOF, the parties have executed this agreement as of the dates written below.</p>
      </div>
      <div class="sig-grid">
        <div class="sig-block">
          <div class="sig-label">${company.legalName}</div>
          ${companySig}
          <div class="sig-by">By:</div>
          <div class="sig-name">Name: ${company.authorizedSignatory}</div>
          <div class="sig-title">Title: ${company.authorizedSignatoryTitle}</div>
          <div class="sig-date">${signatures?.company?.signedAt ? `Date: ${signatures.company.signedAt}` : ""}</div>
        </div>
        <div class="sig-block">
          <div class="sig-label">${recipientLabel}</div>
          ${recipientSig}
          <div class="sig-by">By:</div>
          <div class="sig-name">Name: ${partyName}</div>
          <div class="sig-date">${signatures?.recipient?.signedAt ? `Date: ${signatures.recipient.signedAt}` : "Date: ____________________"}</div>
        </div>
      </div>
      <img class="company-seal" src="${sealSrc}" alt="" />
    </section>
  `;
}

function renderAuditCertificate(
  cert: NonNullable<AssembleInput["auditCertificate"]>,
  readableId: string,
  title: string,
  partyName: string,
): string {
  const rows: Array<[string, string]> = [
    ["Document ID", readableId],
    ["Document name", title],
    ["Created", cert.createdAt],
    ["Sent", cert.sentAt ?? "—"],
    ["Recipient", `${partyName}${cert.recipientEmail ? ` · ${cert.recipientEmail}` : ""}`],
    ["Viewed", cert.viewedAt ?? "—"],
    ["Consent accepted", cert.consentAt ?? "—"],
    ["Recipient signed", cert.recipientSignedAt ?? "—"],
    ["Company signed", cert.companySignedAt ?? "—"],
    ["Finalized", cert.finalizedAt ?? "—"],
    ["SHA-256", cert.sha256 ?? "Pending finalization"],
  ];
  return `
    <div class="page certificate">
      <h1>Audit Certificate</h1>
      <p class="doc-lede">This certificate records the signing lifecycle for the agreement. It does not replace the signed document.</p>
      <table class="cert-table">
        ${rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("")}
      </table>
    </div>
  `;
}

export function documentCss(theme: DocumentTheme, isDark: boolean): string {
  const palette =
    theme.id === "amplify_harbor_night"
      ? { bg: "#07131a", fg: "#e8f4f2", muted: "#8aa8a4", line: "rgba(94,234,212,0.22)" }
      : theme.id === "amplify_ember_brief"
        ? { bg: "#1a120c", fg: "#f4ebe3", muted: "#b09a88", line: "rgba(232,160,106,0.22)" }
        : isDark
          ? { bg: "#0c0d0b", fg: "#f4f6ef", muted: "#a3aa9a", line: "rgba(212, 255, 74, 0.18)" }
          : { bg: "#ffffff", fg: "#161616", muted: "#5c5c5c", line: "rgba(22,22,22,0.12)" };
  const { bg, fg, muted, line } = palette;
  const accent = theme.accentColor;
  const heading = theme.headingFont;
  const body = theme.bodyFont;

  return `
    @page { size: ${theme.pageSize}; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      min-height: 100%;
      background: ${bg};
      color: ${fg};
      font-family: ${body}, "IBM Plex Sans", "Helvetica Neue", sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body { font-size: 12.5px; line-height: 1.65; }
    .pdf-bleed { display: none; }
    .page { position: relative; max-width: 820px; margin: 0 auto; padding: 36px 48px 64px; background: ${bg}; }
    @media print {
      html, body { width: 100%; background: ${bg}; }
      .page {
        max-width: none;
        width: auto;
        margin: 0;
        padding: ${theme.margins.top} ${theme.margins.right} ${theme.margins.bottom} ${theme.margins.left};
        background: ${bg};
        box-decoration-break: clone;
        -webkit-box-decoration-break: clone;
      }
      .certificate { break-before: page; }
      .doc-footer {
        display: flex;
        position: fixed;
        left: ${theme.margins.left};
        right: ${theme.margins.right};
        bottom: 7mm;
        margin: 0;
        padding-top: 8px;
        background: ${bg};
      }
    }
    .doc-header { position: relative; display: flex; flex-direction: column; align-items: center; padding: 0 0 8px; margin-bottom: 18px; }
    .brand-logo { height: 58px; width: auto; max-width: 280px; object-fit: contain; }
    .header-meta { position: absolute; right: 0; top: 0; text-align: right; }
    .doc-id { font-variant-numeric: tabular-nums; letter-spacing: 0.04em; color: ${muted}; font-size: 10px; }
    .doc-title {
      font-family: ${heading}, sans-serif;
      font-size: 22px;
      font-weight: 600;
      letter-spacing: -0.02em;
      text-align: center;
      text-transform: uppercase;
      color: ${accent};
      margin: 0 0 22px;
    }
    .parties { display: grid; gap: 16px; margin: 0 0 28px; }
    .party-label { font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: ${muted}; margin-bottom: 4px; }
    .party-name { color: ${accent}; font-size: 15px; font-weight: 600; margin-bottom: 4px; }
    .party p { margin: 0 0 2px; color: ${fg}; }
    .doc-lede { color: ${muted}; margin: 0 0 32px; }
    .doc-section { margin: 0 0 28px; }
    .section-lead { break-inside: avoid; page-break-inside: avoid; }
    .doc-section h2 {
      font-family: ${heading}, sans-serif;
      font-size: 13px;
      font-weight: 560;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      display: flex;
      gap: 12px;
      align-items: baseline;
      border-bottom: 1px solid ${line};
      padding-bottom: 8px;
      margin: 0 0 12px;
      break-after: avoid;
      page-break-after: avoid;
    }
    .section-num { color: ${accent}; font-variant-numeric: tabular-nums; }
    .clause { margin: 0 0 12px; }
    .clause p { margin: 0 0 10px; orphans: 3; widows: 3; }
    .clause ul { margin: 0 0 10px; padding-left: 18px; }
    .signatures { position: relative; }
    .signatures, .sig-grid, .sig-block { break-inside: avoid; page-break-inside: avoid; }
    .sig-grid { display: grid; grid-template-columns: ${theme.signatureLayout === "stacked" ? "1fr" : "1fr 1fr"}; gap: 32px; margin-top: 16px; padding-right: 96px; }
    .sig-block { min-height: 168px; }
    .sig-label { font-size: 11px; letter-spacing: 0.04em; color: ${accent}; font-weight: 600; margin-bottom: 8px; }
    .sig-line { border-bottom: 1px solid ${line}; height: 72px; margin-bottom: 8px; }
    .sig-img { height: 72px; width: auto; max-width: 180px; object-fit: contain; object-position: left bottom; margin: 4px 0 8px; }
    .sig-by { font-size: 12px; margin-bottom: 2px; }
    .sig-name { font-weight: 600; }
    .sig-title, .sig-org, .sig-date { color: ${muted}; font-size: 11px; }
    .company-seal { position: absolute; right: 0; bottom: 0; width: 78px; height: auto; opacity: 0.85; pointer-events: none; }
    .doc-footer { display: flex; justify-content: space-between; color: ${muted}; font-size: 10px; border-top: 2px solid ${accent}; padding-top: 10px; margin-top: 48px; }
    @media screen {
      .page { min-height: 100vh; display: flex; flex-direction: column; }
      .doc-footer { margin-top: auto; }
    }
    .certificate h1 { font-size: 24px; }
    .cert-table { width: 100%; border-collapse: collapse; }
    .cert-table th, .cert-table td { text-align: left; padding: 10px 8px; border-bottom: 1px solid ${line}; vertical-align: top; }
    .cert-table th { width: 34%; color: ${muted}; font-weight: 500; }
  `;
}
