"use client";

import { cloneElement, isValidElement, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { BackLink } from "@/components/page-header";
import { StepTransition } from "@/components/motion/step-transition";
import { assembleDocument } from "@/lib/render/assemble";
import { recommendDocumentType } from "@/lib/rules/engine";
import { generateAction, recommendAction, createPersonAction, createCompanyAction } from "@/lib/actions/workspace";
import { recommendFromClientHistory, recommendFromPersonHistory } from "@/lib/knowledge/library";
import { AiCaption, AiHint } from "@/components/ai-hint";
import { cn } from "@/lib/utils";
import type {
  Clause,
  ClauseVersion,
  CompanyRecord,
  CompanySettings,
  ContractDocument,
  DocumentTheme,
  Person,
  RoleProfile,
  SourceDocument,
  Template,
  TemplateVersion,
} from "@/lib/types";
import type { DocumentAction, PartyType, PersonType } from "@/lib/types/enums";

type Catalog = {
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
};

const STEPS = [
  { n: "01", label: "Party" },
  { n: "02", label: "Record" },
  { n: "03", label: "Action" },
  { n: "04", label: "Template" },
  { n: "05", label: "Terms" },
  { n: "06", label: "Clauses" },
] as const;

const PARTY_OPTIONS: Array<{ value: PartyType; label: string; hint: string }> = [
  { value: "employee", label: "Employee", hint: "Hire, promote, or amend a staff agreement" },
  { value: "contractor", label: "Contractor", hint: "Contractor engagement on the employment family" },
  { value: "intern", label: "Intern", hint: "Internship or stipend agreement" },
  { value: "client", label: "Client", hint: "Lead generation, collaboration, or media buying" },
  { value: "company", label: "Company", hint: "Company-to-company agreement" },
  { value: "other", label: "Other", hint: "Custom party when the record does not fit above" },
];

const EMPLOYEE_ACTIONS: Array<{ value: DocumentAction; label: string; hint: string }> = [
  { value: "hire", label: "Hire", hint: "New employment relationship" },
  { value: "promote", label: "Promote", hint: "Amend the existing agreement" },
  { value: "change_salary", label: "Change salary", hint: "Compensation amendment" },
  { value: "amend_agreement", label: "Amend agreement", hint: "Other change to the original" },
  { value: "generate_nda", label: "Generate NDA", hint: "Confidentiality on the employment family" },
  { value: "terminate", label: "Terminate", hint: "End the relationship" },
  { value: "custom", label: "Custom", hint: "Choose the template yourself" },
];

const CLIENT_ACTIONS: Array<{ value: DocumentAction; label: string; hint: string }> = [
  { value: "new_lead_generation", label: "Lead generation", hint: "Outbound or inbound lead work" },
  { value: "new_collaboration", label: "Collaboration", hint: "Affiliate or inbound-call partnership" },
  { value: "new_media_buying", label: "Media buying", hint: "Paid media management" },
  { value: "new_service_agreement", label: "Service agreement", hint: "General client services" },
  { value: "renew", label: "Renew", hint: "Continue the historical agreement type" },
  { value: "amend_services", label: "Amend services", hint: "Change scope on the existing type" },
  { value: "change_pricing", label: "Change pricing", hint: "Commercial amendment" },
  { value: "generate_nda", label: "NDA", hint: "Client confidentiality" },
  { value: "custom", label: "Custom", hint: "Choose the template yourself" },
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const EMPTY_ADDRESS = { line1: "", line2: "", city: "", state: "", postalCode: "", country: "" };

function personTypeFromParty(party: PartyType): PersonType {
  if (party === "intern" || party === "contractor" || party === "other") return party;
  return "employee";
}

function defaultVars(company?: CompanySettings | null) {
  const c = company ?? ({
    defaultCurrency: "PKR",
    defaultProbationDays: 30,
    defaultWorkMode: "hybrid",
    defaultNoticePeriodDays: 30,
    defaultJurisdiction: "Pakistan",
  } as CompanySettings);
  return {
    jobTitle: "Software Developer",
    department: "Engineering",
    reportingManager: "",
    startDate: new Date().toISOString().slice(0, 10),
    responsibilities: [
      "Design, build, and maintain internal and client-facing software",
      "Write tests and participate in code review",
      "Collaborate with operations and media teams on tooling",
      "Protect source code, credentials, and production systems",
    ],
    compensation: {
      salary: {
        amount: 150000,
        currency: c.defaultCurrency,
        frequency: "monthly",
        paymentTiming: "monthly in arrears",
      },
      bonus: { enabled: false, type: "performance", amount: 0, percentage: 0, description: "" },
      commission: { enabled: false, structure: "" },
      benefits: { enabled: false, items: [] as string[] },
      salaryDeductionClause: { enabled: false },
    },
    probation: { enabled: true, duration: c.defaultProbationDays ?? 30, unit: "days", paid: true },
    workingSchedule: {
      workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      shiftType: "evening",
      startTime: "18:00",
      endTime: "02:00",
      breakStart: "22:00",
      breakEnd: "22:30",
      timezone: "Asia/Karachi",
      workMode: c.defaultWorkMode ?? "remote",
      flexibleSchedule: false,
      urgentAvailability: false,
    },
    noticePeriodDays: c.defaultNoticePeriodDays,
    clientProtectionMonths: 12,
    jurisdiction: c.defaultJurisdiction,
    remoteWork: (c.defaultWorkMode ?? "remote") !== "on_site",
    serviceFee: 3500,
    feeCurrency: c.defaultCurrency === "PKR" ? "USD" : c.defaultCurrency,
    feeFrequency: "monthly",
    termMonths: 12,
    adSpendPaidSeparately: true,
    noSalesGuarantee: true,
    clientOwnsLeads: true,
    inboundCalls: false,
    services: ["Paid media management", "Creative iteration", "Weekly reporting"],
  };
}

export function GenerateWizard({ catalog }: { catalog: Catalog }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [partyType, setPartyType] = useState<PartyType>("employee");
  const [personId, setPersonId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [action, setAction] = useState<DocumentAction>("hire");
  const [templateId, setTemplateId] = useState("tpl_employment_standard");
  const [reason, setReason] = useState("A new employment relationship should start from the approved Standard Employment Agreement.");
  const [reasonSource, setReasonSource] = useState<"rules" | "history" | "ai">("rules");
  const [recommending, setRecommending] = useState(false);
  const [vars, setVars] = useState(() => defaultVars(catalog.company));
  const [disabledClauseIds, setDisabledClauseIds] = useState<string[]>([]);
  const [enabledOptional, setEnabledOptional] = useState<string[]>(["cl_remote_work"]);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [savingRecord, setSavingRecord] = useState(false);
  const [createdPeople, setCreatedPeople] = useState<Person[]>([]);
  const [createdCompanies, setCreatedCompanies] = useState<CompanyRecord[]>([]);

  const people = useMemo(() => {
    const ids = new Set(createdPeople.map((item) => item.id));
    return [...createdPeople, ...catalog.people.filter((item) => !ids.has(item.id))];
  }, [catalog.people, createdPeople]);
  const companies = useMemo(() => {
    const ids = new Set(createdCompanies.map((item) => item.id));
    return [...createdCompanies, ...catalog.companies.filter((item) => !ids.has(item.id))];
  }, [catalog.companies, createdCompanies]);

  const person = people.find((item) => item.id === personId);
  const client = companies.find((item) => item.id === companyId);
  const template = catalog.templates.find((item) => item.id === templateId);
  const templateVersion = catalog.templateVersions.find((item) => item.id === template?.currentVersionId);
  const theme =
    catalog.themes.find((item) => item.id === template?.themeId) ??
    catalog.themes[0] ??
    null;
  const company = catalog.company;
  const isClient = partyType === "client" || partyType === "company";
  const recordReady = isClient ? Boolean(client) : Boolean(person);

  const existingEmployment = catalog.documents.some(
    (doc) => doc.personId === personId && doc.family === "EMPLOYMENT" && doc.status === "FINALIZED",
  );

  const showDocumentPreview = step >= 4 && Boolean(template && templateVersion && theme && company);

  const preview = useMemo(() => {
    if (!showDocumentPreview || !template || !templateVersion || !theme || !company) return "";
    const variables = isClient
      ? {
          ...vars,
          responsibilities: vars.services,
          startDate: vars.startDate,
        }
      : vars;
    return assembleDocument({
      template,
      templateVersion,
      clauses: catalog.clauses,
      clauseVersions: catalog.clauseVersions,
      theme,
      company,
      person: isClient ? null : person,
      client: isClient ? client : null,
      variables,
      enabledOptionalClauseIds: enabledOptional,
      disabledClauseIds,
    }).html;
  }, [showDocumentPreview, template, templateVersion, theme, company, vars, catalog, person, client, enabledOptional, disabledClauseIds, isClient]);

  const includedClauses = useMemo(() => {
    if (!templateVersion) return [];
    const ids = new Set(templateVersion.sections.flatMap((section) => section.clauseIds));
    return catalog.clauses.filter((clause) => ids.has(clause.id));
  }, [templateVersion, catalog.clauses]);

  const records = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (isClient) {
      return companies.filter((item) => {
        if (!needle) return true;
        return [item.legalName, item.displayName, item.primaryContact, item.email].join(" ").toLowerCase().includes(needle);
      });
    }
    return people.filter((item) => {
      if (partyType === "intern" && item.type !== "intern") return false;
      if (partyType === "contractor" && item.type !== "contractor") return false;
      if (partyType === "employee" && item.type !== "employee" && item.type !== "consultant") return false;
      if (!needle) return true;
      return [item.fullLegalName, item.currentJobTitle, item.department, item.email, item.employeeId]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [companies, people, isClient, partyType, query]);

  const canContinue =
    step === 1
      ? Boolean(partyType)
      : step === 2
        ? recordReady
        : step === 3
          ? Boolean(action)
          : step === 4
            ? Boolean(templateId)
            : true;

  async function applyRecommendation() {
    setRecommending(true);
    try {
      const rec = await recommendAction({
        partyType,
        action,
        personId: isClient ? undefined : personId || undefined,
        companyId: isClient ? companyId || undefined : undefined,
        jobTitle: vars.jobTitle,
      });
      if (rec.ai?.reason) {
        setTemplateId(rec.ai.templateId || rec.templateId);
        setReason(rec.ai.reason);
        setReasonSource("ai");
      } else {
        setTemplateId(rec.templateId);
        setReason(rec.reason);
        setReasonSource("rules");
      }
    } finally {
      setRecommending(false);
    }
  }

  async function onGenerate() {
    setBusy(true);
    try {
      const related = existingEmployment
        ? catalog.documents.find(
            (doc) => doc.personId === personId && doc.documentType === "employment_standard" && doc.status === "FINALIZED",
          )?.id
        : undefined;
      const document = await Promise.race([
        generateAction({
          partyType,
          personId: isClient ? undefined : personId,
          companyId: isClient ? companyId : undefined,
          action,
          templateId,
          relatedDocumentId: action === "promote" || action === "amend_agreement" ? related : undefined,
          variables: isClient ? { ...vars, responsibilities: vars.services } : vars,
          enabledOptionalClauseIds: enabledOptional,
          disabledClauseIds,
          themeId: template?.themeId,
        }),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Generation timed out. Refresh and try again.")), 20000);
        }),
      ]);
      toast.success(`Generated ${document.readableId}`);
      router.push(`/documents/${document.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate document");
    } finally {
      setBusy(false);
    }
  }

  function patch<K extends keyof typeof vars>(key: K, value: (typeof vars)[K]) {
    setVars((current) => ({ ...current, [key]: value }));
  }

  function selectPerson(record: Person) {
    setPersonId(record.id);
    const history = recommendFromPersonHistory(catalog.sources ?? [], record.id);
    const nextTitle = history?.analysis.role || record.currentJobTitle;
    setVars((current) => ({
      ...current,
      jobTitle: nextTitle || current.jobTitle,
      department: record.department || current.department,
      reportingManager: record.reportingManager || current.reportingManager,
      startDate: record.employmentStartDate || current.startDate,
      compensation: {
        ...current.compensation,
        salary: {
          ...current.compensation.salary,
          amount: record.currentSalary || current.compensation.salary.amount,
          currency: record.salaryCurrency || current.compensation.salary.currency,
        },
      },
    }));
    if (history) {
      setAction(history.action);
      setTemplateId(history.templateId);
      setReason(history.reason);
      setReasonSource("history");
    }
  }

  function selectCompany(record: CompanyRecord) {
    setCompanyId(record.id);
    const history = recommendFromClientHistory(catalog.sources ?? [], record.id);
    if (history) {
      setAction(history.action);
      setTemplateId(history.templateId);
      setReason(history.reason);
      setReasonSource("history");
      patch("inboundCalls", history.analysis.patterns.includes("inbound calls"));
      return;
    }
    setAction("new_lead_generation");
    setTemplateId("tpl_lead_generation");
    setReason("A new client starts from the approved Lead Generation Agreement.");
    setReasonSource("rules");
  }

  async function saveNewPerson(formData: FormData) {
    setSavingRecord(true);
    try {
      const firstName = String(formData.get("firstName") ?? "").trim();
      const lastName = String(formData.get("lastName") ?? "").trim();
      const created = await createPersonAction({
        firstName,
        lastName,
        fullLegalName: `${firstName} ${lastName}`.trim(),
        email: String(formData.get("email") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        type: personTypeFromParty(partyType),
        currentJobTitle: String(formData.get("currentJobTitle") ?? ""),
        department: String(formData.get("department") ?? ""),
        country: "Pakistan",
        salaryCurrency: "PKR",
        salaryFrequency: "monthly",
        employmentStatus: "offer_pending",
        currentSalary: 0,
        notes: "",
        middleName: "",
        fatherName: "",
        identityNumber: "",
        dateOfBirth: "",
        employeeId: "",
        reportingManager: "",
        employmentStartDate: "",
        city: "",
        province: "",
        residentialAddress: { ...EMPTY_ADDRESS, country: "Pakistan" },
        permanentAddress: { ...EMPTY_ADDRESS, country: "Pakistan" },
      });
      setCreatedPeople((current) => [created, ...current]);
      selectPerson(created);
      setCreating(false);
      setQuery("");
      toast.success(`${created.fullLegalName} added`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create person");
    } finally {
      setSavingRecord(false);
    }
  }

  async function saveNewCompany(formData: FormData) {
    setSavingRecord(true);
    try {
      const legalName = String(formData.get("legalName") ?? "").trim();
      const created = await createCompanyAction({
        legalName,
        displayName: String(formData.get("displayName") ?? "").trim() || legalName,
        email: String(formData.get("email") ?? ""),
        primaryContact: String(formData.get("primaryContact") ?? ""),
        contactTitle: String(formData.get("contactTitle") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        companyType: "LLC",
        website: "",
        billingAddress: { ...EMPTY_ADDRESS, country: "United States" },
        businessAddress: { ...EMPTY_ADDRESS, country: "United States" },
        city: "",
        state: "",
        postalCode: "",
        country: "United States",
        jurisdiction: String(formData.get("jurisdiction") ?? ""),
        relationshipStatus: "prospect",
        notes: "",
      });
      setCreatedCompanies((current) => [created, ...current]);
      selectCompany(created);
      setCreating(false);
      setQuery("");
      toast.success(`${created.legalName} added`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create client");
    } finally {
      setSavingRecord(false);
    }
  }

  function goNext() {
    if (!canContinue) return;
    if (step === 3) {
      const historical = isClient
        ? recommendFromClientHistory(catalog.sources ?? [], companyId)
        : recommendFromPersonHistory(catalog.sources ?? [], personId);
      const rec = recommendDocumentType({
        partyType,
        action,
        hasExistingEmploymentAgreement: existingEmployment,
        historicalTemplateId: historical?.templateId,
        historicalReason: historical?.reason,
      });
      const nextId =
        !isClient && vars.jobTitle.toLowerCase().includes("appointment setter")
          ? "tpl_employment_appointment_setter"
          : rec.templateId;
      setTemplateId(nextId);
      setReason(rec.reason);
      setReasonSource(historical ? "history" : "rules");
    }
    setStep((n) => n + 1);
  }

  const stepCopy = {
    1: { title: "Who is this for?", hint: "The party type decides the template family." },
    2: {
      title: isClient ? "Which client?" : "Which person?",
      hint: isClient ? "Historical client agreements set the starting template." : "Historical employment files set the starting template.",
    },
    3: { title: "What is changing?", hint: "Hire, amend, or open a new client engagement." },
    4: { title: "Approved template", hint: reason },
    5: { title: "Commercial terms", hint: "These fields fill the locked clauses. They do not rewrite them." },
    6: { title: "Clauses in force", hint: "Optional clauses can be toggled. Approved wording stays locked." },
  } as const;

  const current = stepCopy[step as keyof typeof stepCopy];
  const partyLabel = PARTY_OPTIONS.find((item) => item.value === partyType)?.label ?? partyType;
  const actionLabel = [...EMPLOYEE_ACTIONS, ...CLIENT_ACTIONS].find((item) => item.value === action)?.label ?? action;
  const recordLabel = person?.fullLegalName ?? client?.legalName ?? "—";

  if (!catalog.company || catalog.templates.length === 0) {
    return (
      <div className="max-w-lg space-y-4">
        <BackLink href="/dashboard" label="Dashboard" />
        <h1 className="font-display text-3xl tracking-tight">Workspace not ready</h1>
        <p className="text-sm text-muted-foreground">
          Company settings or templates are missing from the API. Refresh once, or check that Firestore
          bootstrap finished.
        </p>
        <a href="/generate" className="inline-flex rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">
          Reload Generate
        </a>
      </div>
    );
  }

  return (
    <div className="relative xl:grid xl:grid-cols-[minmax(20rem,32rem)_minmax(0,1fr)] xl:items-start xl:gap-12">
      <div className="relative z-10 flex min-h-0 flex-col bg-background xl:sticky xl:top-6 xl:h-[calc(100vh-8rem)]">
        <BackLink href="/dashboard" label="Dashboard" />
        <ol className="flex shrink-0 gap-x-4 gap-y-2 overflow-x-auto border-b border-border pb-3">
          {STEPS.map((item, index) => {
            const n = index + 1;
            const active = step === n;
            const done = step > n;
            return (
              <li key={item.label}>
                <button
                  type="button"
                  onClick={() => {
                    if (n <= step) setStep(n);
                  }}
                  className={cn(
                    "flex items-baseline gap-2 whitespace-nowrap rounded-md px-2 py-1 text-[13px]",
                    active
                      ? "bg-primary/15 text-foreground"
                      : done
                        ? "text-foreground/70 hover:bg-muted/60"
                        : "text-muted-foreground",
                  )}
                >
                  <span className={cn("font-mono text-[11px]", active || done ? "text-primary" : "text-muted-foreground")}>
                    {item.n}
                  </span>
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="min-h-0 flex-1 overflow-y-auto py-6 pr-1">
          <StepTransition stepKey={step}>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] text-muted-foreground">{current.hint}</p>
            {step === 4 && reasonSource === "ai" ? <AiHint>AI suggestion</AiHint> : null}
          </div>
          <h1 className="font-display mt-2 text-[1.85rem] leading-tight tracking-tight">{current.title}</h1>
          {step === 4 && reasonSource === "ai" ? (
            <AiCaption>AI suggested this approved template — wording still comes from the library.</AiCaption>
          ) : null}

          {step === 1 ? (
            <div className="mt-6">
              {PARTY_OPTIONS.map((option, index) => (
                <OptionRow
                  key={option.value}
                  n={String(index + 1).padStart(2, "0")}
                  title={option.label}
                  meta={option.hint}
                  selected={partyType === option.value}
                  onClick={() => {
                    setPartyType(option.value);
                    setAction(option.value === "client" || option.value === "company" ? "new_lead_generation" : "hire");
                    setTemplateId(
                      option.value === "client" || option.value === "company"
                        ? "tpl_lead_generation"
                        : "tpl_employment_standard",
                    );
                    setQuery("");
                    setCreating(false);
                    if (option.value === "client" || option.value === "company") {
                      setPersonId("");
                    } else {
                      setCompanyId("");
                    }
                  }}
                />
              ))}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="mt-6">
              {creating ? (
                <form action={isClient ? saveNewCompany : saveNewPerson} className="space-y-4">
                  {isClient ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Legal name">
                        <Input name="legalName" required autoFocus />
                      </Field>
                      <Field label="Display name">
                        <Input name="displayName" />
                      </Field>
                      <Field label="Email">
                        <Input name="email" type="email" required />
                      </Field>
                      <Field label="Primary contact">
                        <Input name="primaryContact" required />
                      </Field>
                      <Field label="Contact title">
                        <Input name="contactTitle" />
                      </Field>
                      <Field label="Phone">
                        <Input name="phone" />
                      </Field>
                      <Field label="Jurisdiction">
                        <Input name="jurisdiction" placeholder="Florida, USA" />
                      </Field>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="First name">
                        <Input name="firstName" required autoFocus />
                      </Field>
                      <Field label="Last name">
                        <Input name="lastName" required />
                      </Field>
                      <Field label="Email">
                        <Input name="email" type="email" required />
                      </Field>
                      <Field label="Phone">
                        <Input name="phone" />
                      </Field>
                      <Field label="Job title">
                        <Input name="currentJobTitle" />
                      </Field>
                      <Field label="Department">
                        <Input name="department" />
                      </Field>
                    </div>
                  )}
                  <p className="text-[13px] text-muted-foreground">
                    Saved to the directory and selected for this agreement.
                  </p>
                  <div className="flex items-center gap-2">
                    <Button type="submit" disabled={savingRecord}>
                      {savingRecord ? "Saving…" : isClient ? "Save client" : "Save person"}
                    </Button>
                    <Button type="button" variant="ghost" disabled={savingRecord} onClick={() => setCreating(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setCreating(true)}
                    className="mb-4 flex w-full items-center justify-between rounded-md border border-dashed border-primary/35 px-4 py-3.5 text-left hover:bg-primary/10"
                  >
                    <span>
                      <span className="block text-[15px] font-medium">{isClient ? "New client" : "New person"}</span>
                      <span className="mt-1 block text-[13px] text-muted-foreground">
                        Create a record, then generate this agreement
                      </span>
                    </span>
                    <span className="font-mono text-[11px] text-primary">Add</span>
                  </button>
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={isClient ? "Search clients" : "Search people"}
                    className="mb-4"
                  />
                  {records.length === 0 ? (
                    <p className="border-t border-border py-10 text-sm text-muted-foreground">
                      No records match this party type.
                    </p>
                  ) : null}
                  {records.map((record, index) => {
                    const id = record.id;
                    const selected = isClient ? companyId === id : personId === id;
                    const title = "fullLegalName" in record ? record.fullLegalName : record.legalName;
                    const history = isClient
                      ? recommendFromClientHistory(catalog.sources ?? [], id)
                      : recommendFromPersonHistory(catalog.sources ?? [], id);
                    const meta = isClient
                      ? [history?.analysis.title, history?.analysis.monthlyFee].filter(Boolean).join(" · ") ||
                        ("primaryContact" in record ? record.primaryContact : "")
                      : [history?.analysis.title, history?.analysis.monthlyFee].filter(Boolean).join(" · ") ||
                        ("currentJobTitle" in record ? record.currentJobTitle : "");
                    return (
                      <OptionRow
                        key={id}
                        n={String(index + 1).padStart(2, "0")}
                        title={title}
                        meta={meta || "No historical agreement"}
                        selected={selected}
                        onClick={() => {
                          if (isClient && "legalName" in record) selectCompany(record);
                          if (!isClient && "fullLegalName" in record) selectPerson(record);
                        }}
                      />
                    );
                  })}
                </>
              )}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="mt-6">
              {(isClient ? CLIENT_ACTIONS : EMPLOYEE_ACTIONS).map((option, index) => (
                <OptionRow
                  key={option.value}
                  n={String(index + 1).padStart(2, "0")}
                  title={option.label}
                  meta={option.hint}
                  selected={action === option.value}
                  onClick={() => setAction(option.value)}
                />
              ))}
            </div>
          ) : null}

          {step === 4 ? (
            <div className="mt-6">
              {existingEmployment && action === "promote" ? (
                <p className="mb-4 border-l-2 border-primary pl-3 text-sm text-muted-foreground">
                  An existing employment agreement is on file. Promotion should amend rather than recreate it.
                </p>
              ) : null}
              {catalog.templates
                .filter((item) => (isClient ? item.category === "CLIENT" : item.category === "EMPLOYMENT"))
                .map((item, index) => (
                  <OptionRow
                    key={item.id}
                    n={String(index + 1).padStart(2, "0")}
                    title={item.name}
                    meta={`v${item.currentVersion} · ${item.documentType}`}
                    selected={templateId === item.id}
                    onClick={() => setTemplateId(item.id)}
                  />
                ))}
              <Button
                type="button"
                variant="outline"
                className="mt-5"
                disabled={recommending}
                onClick={() => void applyRecommendation()}
              >
                {recommending ? "Asking AI…" : "Refresh AI recommendation"}
              </Button>
              {reasonSource === "ai" ? (
                <AiCaption className="mt-3">AI suggestion — pick another approved template if it doesn’t fit.</AiCaption>
              ) : null}
            </div>
          ) : null}

          {step === 5 ? (
            <div className="mt-6 space-y-5">
              {!isClient ? (
                <>
                  <Field label="Role profile">
                    <select
                      className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm"
                      value={
                        catalog.roleProfiles.find((item) => item.name.toLowerCase() === vars.jobTitle.toLowerCase())?.id ??
                        ""
                      }
                      onChange={(event) => {
                        const role = catalog.roleProfiles.find((item) => item.id === event.target.value);
                        if (!role) return;
                        patch("jobTitle", role.name);
                        patch("department", role.department);
                        patch("responsibilities", role.suggestedResponsibilities);
                        if (role.name === "Appointment Setter") {
                          setTemplateId("tpl_employment_appointment_setter");
                        }
                      }}
                    >
                      <option value="">Custom role</option>
                      {catalog.roleProfiles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Job title">
                      <Input value={vars.jobTitle} onChange={(e) => patch("jobTitle", e.target.value)} />
                    </Field>
                    <Field label="Department">
                      <Input value={vars.department} onChange={(e) => patch("department", e.target.value)} />
                    </Field>
                    <Field label="Reporting manager">
                      <Input value={vars.reportingManager} onChange={(e) => patch("reportingManager", e.target.value)} />
                    </Field>
                    <Field label="Start date">
                      <Input type="date" value={vars.startDate} onChange={(e) => patch("startDate", e.target.value)} />
                    </Field>
                    <Field label="Salary">
                      <Input
                        type="number"
                        value={vars.compensation.salary.amount}
                        onChange={(e) =>
                          patch("compensation", {
                            ...vars.compensation,
                            salary: { ...vars.compensation.salary, amount: Number(e.target.value) },
                          })
                        }
                      />
                    </Field>
                    <Field label="Currency">
                      <Input
                        value={vars.compensation.salary.currency}
                        onChange={(e) =>
                          patch("compensation", {
                            ...vars.compensation,
                            salary: { ...vars.compensation.salary, currency: e.target.value },
                          })
                        }
                      />
                    </Field>
                    <Field label="Notice period (days)">
                      <Input
                        type="number"
                        value={vars.noticePeriodDays}
                        onChange={(e) => patch("noticePeriodDays", Number(e.target.value))}
                      />
                    </Field>
                    <Field label="Client protection (months)">
                      <Input
                        type="number"
                        value={vars.clientProtectionMonths}
                        onChange={(e) => patch("clientProtectionMonths", Number(e.target.value))}
                      />
                    </Field>
                  </div>
                  <Toggle
                    label="Probation"
                    checked={vars.probation.enabled}
                    onChange={(checked) => patch("probation", { ...vars.probation, enabled: checked })}
                  />
                  {vars.probation.enabled ? (
                    <Field label="Probation duration">
                      <Input
                        type="number"
                        value={vars.probation.duration}
                        onChange={(e) => patch("probation", { ...vars.probation, duration: Number(e.target.value) })}
                      />
                    </Field>
                  ) : null}
                  <Toggle
                    label="Bonus"
                    checked={vars.compensation.bonus.enabled}
                    onChange={(checked) =>
                      patch("compensation", {
                        ...vars.compensation,
                        bonus: { ...vars.compensation.bonus, enabled: checked },
                      })
                    }
                  />
                  {vars.compensation.bonus.enabled ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Bonus type">
                        <select
                          className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm"
                          value={vars.compensation.bonus.type}
                          onChange={(e) =>
                            patch("compensation", {
                              ...vars.compensation,
                              bonus: { ...vars.compensation.bonus, type: e.target.value },
                            })
                          }
                        >
                          <option value="fixed">Fixed</option>
                          <option value="performance">Performance</option>
                          <option value="percentage">Percentage</option>
                          <option value="commission">Commission</option>
                          <option value="custom">Custom</option>
                        </select>
                      </Field>
                      {vars.compensation.bonus.type === "fixed" ? (
                        <Field label="Bonus amount">
                          <Input
                            type="number"
                            value={vars.compensation.bonus.amount ?? 0}
                            onChange={(e) =>
                              patch("compensation", {
                                ...vars.compensation,
                                bonus: { ...vars.compensation.bonus, amount: Number(e.target.value) },
                              })
                            }
                          />
                        </Field>
                      ) : null}
                      {vars.compensation.bonus.type === "percentage" ? (
                        <Field label="Bonus %">
                          <Input
                            type="number"
                            value={vars.compensation.bonus.percentage ?? 0}
                            onChange={(e) =>
                              patch("compensation", {
                                ...vars.compensation,
                                bonus: { ...vars.compensation.bonus, percentage: Number(e.target.value) },
                              })
                            }
                          />
                        </Field>
                      ) : null}
                      <Field label="Bonus description">
                        <Input
                          value={vars.compensation.bonus.description ?? ""}
                          onChange={(e) =>
                            patch("compensation", {
                              ...vars.compensation,
                              bonus: { ...vars.compensation.bonus, description: e.target.value },
                            })
                          }
                        />
                      </Field>
                    </div>
                  ) : null}
                  <Toggle
                    label="Remote work"
                    checked={vars.remoteWork}
                    onChange={(checked) => {
                      patch("remoteWork", checked);
                      patch("workingSchedule", {
                        ...vars.workingSchedule,
                        workMode: checked ? "remote" : "on_site",
                      });
                      setEnabledOptional((current) =>
                        checked
                          ? Array.from(new Set([...current, "cl_remote_work"]))
                          : current.filter((id) => id !== "cl_remote_work"),
                      );
                    }}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Start time">
                      <Input
                        type="time"
                        value={vars.workingSchedule.startTime}
                        onChange={(e) => patch("workingSchedule", { ...vars.workingSchedule, startTime: e.target.value })}
                      />
                    </Field>
                    <Field label="End time">
                      <Input
                        type="time"
                        value={vars.workingSchedule.endTime}
                        onChange={(e) => patch("workingSchedule", { ...vars.workingSchedule, endTime: e.target.value })}
                      />
                    </Field>
                  </div>
                  <div>
                    <Label className="mb-2 block">Working days</Label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS.map((day) => {
                        const on = vars.workingSchedule.workingDays.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            className={cn(
                              "rounded-md border px-3 py-1 text-xs",
                              on
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border text-muted-foreground hover:text-foreground",
                            )}
                            onClick={() => {
                              const next = on
                                ? vars.workingSchedule.workingDays.filter((item) => item !== day)
                                : [...vars.workingSchedule.workingDays, day];
                              patch("workingSchedule", { ...vars.workingSchedule, workingDays: next });
                            }}
                          >
                            {day.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <Field label="Responsibilities (one per line)">
                    <Textarea
                      rows={5}
                      value={vars.responsibilities.join("\n")}
                      onChange={(e) => patch("responsibilities", e.target.value.split("\n").filter(Boolean))}
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Start date">
                    <Input type="date" value={vars.startDate} onChange={(e) => patch("startDate", e.target.value)} />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Monthly retainer">
                      <Input type="number" value={vars.serviceFee} onChange={(e) => patch("serviceFee", Number(e.target.value))} />
                    </Field>
                    <Field label="Currency">
                      <Input value={vars.feeCurrency} onChange={(e) => patch("feeCurrency", e.target.value)} />
                    </Field>
                    <Field label="Term (months)">
                      <Input type="number" value={vars.termMonths} onChange={(e) => patch("termMonths", Number(e.target.value))} />
                    </Field>
                  </div>
                  <Toggle label="Ad spend paid separately" checked={vars.adSpendPaidSeparately} onChange={(checked) => patch("adSpendPaidSeparately", checked)} />
                  <Toggle label="No sales guarantee" checked={vars.noSalesGuarantee} onChange={(checked) => patch("noSalesGuarantee", checked)} />
                  <Toggle label="Client owns generated leads" checked={vars.clientOwnsLeads} onChange={(checked) => patch("clientOwnsLeads", checked)} />
                  <Toggle label="Inbound call generation" checked={vars.inboundCalls} onChange={(checked) => patch("inboundCalls", checked)} />
                  <Field label="Services (one per line)">
                    <Textarea rows={4} value={vars.services.join("\n")} onChange={(e) => patch("services", e.target.value.split("\n").filter(Boolean))} />
                  </Field>
                </>
              )}
            </div>
          ) : null}

          {step === 6 ? (
            <div className="mt-6 space-y-3">
              {includedClauses.map((clause) => {
                const optional = clause.status === "optional";
                const checked = optional ? enabledOptional.includes(clause.id) : !disabledClauseIds.includes(clause.id);
                return (
                  <label key={clause.id} className="flex items-center gap-3 border-b border-border py-3 text-sm">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => {
                        const on = Boolean(value);
                        if (optional) {
                          setEnabledOptional((current) => (on ? [...current, clause.id] : current.filter((id) => id !== clause.id)));
                        } else {
                          setDisabledClauseIds((current) => (on ? current.filter((id) => id !== clause.id) : [...current, clause.id]));
                        }
                      }}
                    />
                    <span>{clause.title}</span>
                    {optional ? <span className="ml-auto text-[11px] text-muted-foreground">Optional</span> : null}
                  </label>
                );
              })}
            </div>
          ) : null}
          </StepTransition>
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-border bg-background pt-4">
          <Button type="button" variant="ghost" disabled={step === 1} onClick={() => setStep((n) => n - 1)}>
            Back
          </Button>
          {step < 6 ? (
            <Button type="button" disabled={!canContinue} onClick={goNext}>
              Continue
            </Button>
          ) : (
            <Button type="button" disabled={busy || !recordReady} onClick={() => void onGenerate()}>
              {busy ? "Generating…" : "Generate draft"}
            </Button>
          )}
        </div>
      </div>

      <aside className="relative z-0 mt-10 min-h-[28rem] min-w-0 xl:mt-0 xl:sticky xl:top-6 xl:h-[calc(100vh-8rem)]">
        {showDocumentPreview ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="font-display text-xl tracking-tight">Preview</h2>
              <span className="font-mono text-[11px] text-muted-foreground">{template?.name}</span>
            </div>
            <iframe title="Document preview" className="min-h-[28rem] w-full flex-1 rounded-md border border-border bg-muted xl:min-h-0" srcDoc={preview} />
          </div>
        ) : (
          <div className="flex h-full flex-col justify-between rounded-md border border-border px-8 py-8">
            <p className="text-[13px] text-muted-foreground">Proof</p>
            <div>
              <p className="font-display text-[2.35rem] leading-[1.12] tracking-tight">{template?.name ?? "Agreement"}</p>
              <dl className="mt-10 grid gap-5 sm:grid-cols-2">
                <ProofRow k="Party" v={partyLabel} />
                <ProofRow k="Record" v={recordLabel} />
                <ProofRow k="Action" v={actionLabel} />
                <ProofRow k="Template" v={template?.name ?? "—"} />
              </dl>
            </div>
            <p className="text-[13px] text-muted-foreground">The contract preview opens after the template is confirmed.</p>
          </div>
        )}
      </aside>
    </div>
  );
}

function OptionRow({
  n,
  title,
  meta,
  selected,
  onClick,
}: {
  n: string;
  title: string;
  meta?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "grid w-full grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-3 py-3.5 text-left first:border-t",
        selected
          ? "border-l-2 border-l-primary bg-primary/15"
          : "border-l-2 border-l-transparent hover:bg-muted/60",
      )}
    >
      <span
        className={cn(
          "inline-flex size-6 items-center justify-center rounded-sm font-mono text-[11px]",
          selected ? "bg-primary text-primary-foreground" : "text-muted-foreground",
        )}
      >
        {n}
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] leading-snug font-medium">{title}</span>
        {meta ? (
          <span className={cn("mt-1 block truncate text-[13px]", selected ? "text-foreground/70" : "text-muted-foreground")}>
            {meta}
          </span>
        ) : null}
      </span>
      {selected ? (
        <span className="rounded-sm bg-primary px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-primary-foreground uppercase">
          Selected
        </span>
      ) : (
        <span className="w-[1.75rem]" />
      )}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const htmlFor = isValidElement<{ id?: string; name?: string }>(children)
    ? (children.props.id ?? children.props.name)
    : undefined;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {htmlFor && isValidElement(children) ? cloneElement(children, { id: htmlFor } as never) : children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between border-b border-border py-3">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function ProofRow({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">{k}</dt>
      <dd className="mt-1 text-[15px] font-medium">{v}</dd>
    </div>
  );
}
