"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { toast } from "sonner";
import { Bento, MetaList, Stat, Tile } from "@/components/bento";
import { UsersDirectory } from "@/components/settings/users-directory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { brandingAssets } from "@/lib/branding/identity";
import { BRANDING_TYPE_META } from "@/lib/branding/themes";
import { runThemeTransition } from "@/components/motion/theme-transition";
import { saveAiSettingsAction, saveCompanySettingsAction, saveEmailSettingsAction, saveSecuritySettingsAction, saveSigningSettingsAction, sendTestEmailAction } from "@/lib/actions/workspace";
import { formatEmailFrom } from "@/lib/services/email-service";
import { AiHint } from "@/components/ai-hint";
import { cn } from "@/lib/utils";
import type { AiSettings, AiUsage, CompanySettings, DocumentTheme, EmailSettings, SecuritySettings, SigningSettings } from "@/lib/types";
import type { SigningOrder, ThemeId } from "@/lib/types/enums";
import type { PublicOrgUser } from "@/lib/users-public";

export type SecurityRuntimeStatus = {
  sessionSecretConfigured: boolean;
  production: boolean;
  secureCookies: boolean;
  dataAdapter: "local" | "firestore";
  firebaseConfigured: boolean;
};

export type EmailTransportStatus = {
  configured: boolean;
  provider: "resend" | "console";
  from: string;
};

const EXPIRY_PRESETS = [3, 7, 14, 30] as const;
const ORDER_OPTIONS: { id: SigningOrder; label: string; hint: string }[] = [
  { id: "recipient_first", label: "Recipient first", hint: "Party signs, then company countersigns" },
  { id: "company_first", label: "Company first", hint: "Company signs before sending to the party" },
  { id: "parallel", label: "Parallel", hint: "Either party can sign without waiting" },
];

const WORKSPACE_MODES = [
  {
    id: "light" as const,
    label: "Light",
    hint: "Paper field, high contrast type",
    icon: SunIcon,
  },
  {
    id: "dark" as const,
    label: "Dark",
    hint: "Ink field for long sessions",
    icon: MoonIcon,
  },
  {
    id: "system" as const,
    label: "System",
    hint: "Follow macOS / Windows setting",
    icon: MonitorIcon,
  },
];

function AppearancePanel({ selectedTheme }: { selectedTheme?: DocumentTheme }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeMode = mounted ? (theme ?? "system") : "dark";
  const resolved = mounted ? resolvedTheme : "dark";
  const themeMeta = BRANDING_TYPE_META.find((item) => item.id === selectedTheme?.id);

  return (
    <Bento>
      <Tile kicker="Workspace appearance" span={2}>
        <p className="mt-4 max-w-[52ch] text-sm leading-relaxed text-muted-foreground">
          Switch the whole ContractOS UI between light and dark. Preference is saved in this browser — it does not
          change PDF letterhead.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {WORKSPACE_MODES.map((mode) => {
            const Icon = mode.icon;
            const selected = activeMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                aria-pressed={selected}
                onClick={(event) => {
                  void runThemeTransition(event, () => setTheme(mode.id), { nextTheme: mode.id });
                }}
                className={cn(
                  "rounded-md border px-4 py-4 text-left transition-colors",
                  selected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background hover:bg-muted/50",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-[13px] font-medium">
                    <Icon className="size-3.5" />
                    {mode.label}
                  </span>
                  {selected ? (
                    <span className="font-mono text-[10px] tracking-wide text-primary uppercase">Active</span>
                  ) : null}
                </div>
                <div
                  className={cn(
                    "mt-3 flex h-14 items-end overflow-hidden rounded-sm border border-border px-3 pb-2",
                    mode.id === "dark" || (mode.id === "system" && resolved === "dark")
                      ? "bg-[#0c0d0b] text-[#e8e6e1]"
                      : "bg-[#f4f4ef] text-[#121210]",
                  )}
                >
                  <div className="w-full">
                    <div className="h-1 w-10 rounded-full bg-primary" />
                    <div className="mt-2 font-serif text-[11px] leading-none tracking-tight">ContractOS</div>
                  </div>
                </div>
                <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">{mode.hint}</p>
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-[12px] text-muted-foreground">
          Currently rendering as <span className="text-foreground">{resolved ?? "—"}</span>
          {activeMode === "system" ? " (from system)" : null}.
        </p>
      </Tile>
      <Tile kicker="Document letterhead">
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          PDF themes stay independent from workspace light/dark. Change the default under Branding.
        </p>
        {selectedTheme ? (
          <>
            <div
              className="mt-5 flex h-16 items-end overflow-hidden rounded-sm border border-border px-3 pb-2"
              style={{
                background: selectedTheme.background === "dark" ? "#0c0d0b" : "#f4f4ef",
                color: selectedTheme.background === "dark" ? "#e8e6e1" : "#121210",
              }}
            >
              <div className="w-full">
                <div className="h-1 w-10 rounded-full" style={{ background: selectedTheme.accentColor }} />
                <div className="mt-2 font-serif text-[12px] leading-none tracking-tight">{selectedTheme.name}</div>
              </div>
            </div>
            <MetaList
              rows={[
                ["Default", themeMeta?.label ?? selectedTheme.name],
                ["Field", selectedTheme.background],
                ["Page", selectedTheme.pageSize],
              ]}
            />
          </>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No default letterhead selected yet.</p>
        )}
      </Tile>
    </Bento>
  );
}

const SESSION_PRESETS = [1, 7, 14, 30] as const;

export function SettingsPanels({
  company,
  ai,
  usage,
  signing,
  emailSettings,
  securitySettings,
  security,
  users,
  email,
  aiConfigured = false,
  themes,
  canManageUsers = false,
  currentUserId = "",
}: {
  company: CompanySettings;
  ai: AiSettings;
  usage: AiUsage;
  signing: SigningSettings;
  emailSettings: EmailSettings;
  securitySettings: SecuritySettings;
  security: SecurityRuntimeStatus;
  users: PublicOrgUser[];
  email: EmailTransportStatus;
  aiConfigured?: boolean;
  themes: DocumentTheme[];
  canManageUsers?: boolean;
  currentUserId?: string;
}) {
  const [companyState, setCompanyState] = useState(company);
  const [aiState, setAiState] = useState(ai);
  const [signingState, setSigningState] = useState(signing);
  const [emailState, setEmailState] = useState(emailSettings);
  const [securityState, setSecurityState] = useState(securitySettings);
  const [testTo, setTestTo] = useState(company.email);
  const [testing, setTesting] = useState(false);
  const [savingBrand, setSavingBrand] = useState(false);
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [savingSigning, setSavingSigning] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingAi, setSavingAi] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);

  const selectedTheme =
    themes.find((theme) => theme.id === companyState.defaultThemeId) ?? themes[0];
  const darkAssets = brandingAssets(true);
  const lightAssets = brandingAssets(false);

  function selectTheme(id: ThemeId) {
    setCompanyState((prev) => ({ ...prev, defaultThemeId: id }));
  }

  async function saveBranding() {
    setSavingBrand(true);
    try {
      await saveCompanySettingsAction(companyState);
      toast.success("Branding saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save branding");
    } finally {
      setSavingBrand(false);
    }
  }

  async function saveDefaults() {
    setSavingDefaults(true);
    try {
      await saveCompanySettingsAction(companyState);
      toast.success("Document defaults saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save defaults");
    } finally {
      setSavingDefaults(false);
    }
  }

  async function saveSigning() {
    setSavingSigning(true);
    try {
      const next = await saveSigningSettingsAction(signingState);
      setSigningState(next);
      toast.success("Signing settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save signing settings");
    } finally {
      setSavingSigning(false);
    }
  }

  async function saveEmail() {
    setSavingEmail(true);
    try {
      const next = await saveEmailSettingsAction(emailState);
      setEmailState(next);
      toast.success("Email settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save email settings");
    } finally {
      setSavingEmail(false);
    }
  }

  async function saveAi() {
    setSavingAi(true);
    try {
      const next = await saveAiSettingsAction({ ...aiState, draftNewClauses: false });
      setAiState(next);
      toast.success("AI settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save AI settings");
    } finally {
      setSavingAi(false);
    }
  }

  async function saveSecurity() {
    setSavingSecurity(true);
    try {
      const next = await saveSecuritySettingsAction(securityState);
      setSecurityState(next);
      toast.success("Security settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save security settings");
    } finally {
      setSavingSecurity(false);
    }
  }

  const liveFrom = formatEmailFrom(emailState);
  const aiLive = aiConfigured && aiState.enabled;
  const spendPct =
    aiState.hardSpendingLimitUsd > 0
      ? Math.min(100, Math.round((usage.estimatedCostUsd / aiState.hardSpendingLimitUsd) * 100))
      : 0;

  return (
    <Tabs defaultValue="company">
      <TabsList variant="line" className="h-auto flex-wrap justify-start gap-x-4 rounded-none bg-transparent p-0">
        <TabsTrigger value="company">Company</TabsTrigger>
        <TabsTrigger value="branding">Branding</TabsTrigger>
        <TabsTrigger value="appearance">Appearance</TabsTrigger>
        <TabsTrigger value="users">Users & roles</TabsTrigger>
        <TabsTrigger value="defaults">Document defaults</TabsTrigger>
        <TabsTrigger value="signing">Signing</TabsTrigger>
        <TabsTrigger value="email">Email</TabsTrigger>
        <TabsTrigger value="ai">AI</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
      </TabsList>

      <TabsContent value="company" className="mt-6">
        <Bento>
          <Tile kicker="Company identity" span={2}>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Legal name">
                <Input value={companyState.legalName} onChange={(e) => setCompanyState({ ...companyState, legalName: e.target.value })} />
              </Field>
              <Field label="Display name">
                <Input value={companyState.displayName} onChange={(e) => setCompanyState({ ...companyState, displayName: e.target.value })} />
              </Field>
              <Field label="NTN / Tax ID">
                <Input value={companyState.ntn} onChange={(e) => setCompanyState({ ...companyState, ntn: e.target.value })} />
              </Field>
              <Field label="Email">
                <Input value={companyState.email} onChange={(e) => setCompanyState({ ...companyState, email: e.target.value })} />
              </Field>
              <Field label="Phone">
                <Input value={companyState.phone} onChange={(e) => setCompanyState({ ...companyState, phone: e.target.value })} />
              </Field>
              <Field label="US phone">
                <Input value={companyState.usPhone ?? ""} onChange={(e) => setCompanyState({ ...companyState, usPhone: e.target.value })} />
              </Field>
              <Field label="Website">
                <Input value={companyState.website} onChange={(e) => setCompanyState({ ...companyState, website: e.target.value })} />
              </Field>
              <Field label="Authorized signatory">
                <Input value={companyState.authorizedSignatory} onChange={(e) => setCompanyState({ ...companyState, authorizedSignatory: e.target.value })} />
              </Field>
              <Field label="Signatory title">
                <Input value={companyState.authorizedSignatoryTitle} onChange={(e) => setCompanyState({ ...companyState, authorizedSignatoryTitle: e.target.value })} />
              </Field>
              <Button
                className="sm:col-span-2 w-fit"
                onClick={() =>
                  void saveCompanySettingsAction(companyState).then(() => toast.success("Company settings saved"))
                }
              >
                Save company
              </Button>
            </div>
          </Tile>
          <Tile kicker="Live on PDFs">
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Letterhead, footer, and countersignature pull from this identity plus branding assets in `/public/branding`.
            </p>
            <MetaList
              rows={[
                ["Signatory", companyState.authorizedSignatory],
                ["Title", companyState.authorizedSignatoryTitle],
              ]}
            />
          </Tile>
        </Bento>
      </TabsContent>

      <TabsContent value="branding" className="mt-6 space-y-3">
        <Bento>
          <Tile kicker="Document branding types" span={3}>
            <p className="mt-3 max-w-[56ch] text-sm leading-relaxed text-muted-foreground">
              Company default for new agreements. One white letterhead plus Signal Dark, Harbor Night, and Ember
              Brief. On each document, AI suggests which to use — the full catalog is not listed there.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {BRANDING_TYPE_META.map((meta) => {
                const theme = themes.find((item) => item.id === meta.id);
                const selected = companyState.defaultThemeId === meta.id;
                if (!theme) return null;
                return (
                  <button
                    key={meta.id}
                    type="button"
                    onClick={() => selectTheme(meta.id)}
                    aria-pressed={selected}
                    className={`rounded-md border px-4 py-4 text-left transition-colors ${
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-medium">{meta.label}</span>
                      {selected ? (
                        <span className="font-mono text-[10px] tracking-wide text-primary uppercase">Selected</span>
                      ) : null}
                    </div>
                    <div
                      className="mt-3 flex h-14 items-end overflow-hidden rounded-sm border border-border px-3 pb-2"
                      style={{
                        background: theme.background === "dark" ? "#0c0d0b" : "#f4f4ef",
                        color: theme.background === "dark" ? "#e8e6e1" : "#121210",
                      }}
                    >
                      <div className="w-full">
                        <div className="h-1 w-10 rounded-full" style={{ background: theme.accentColor }} />
                        <div className="mt-2 font-serif text-[11px] leading-none tracking-tight">{theme.name}</div>
                      </div>
                    </div>
                    <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">{meta.summary}</p>
                    <p className="mt-2 font-mono text-[10px] text-muted-foreground">{meta.useFor}</p>
                    <dl className="mt-3 space-y-1 text-[11px] text-muted-foreground">
                      <div className="flex justify-between gap-2">
                        <dt>Field</dt>
                        <dd className="capitalize">{theme.background}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt>Page</dt>
                        <dd>{theme.pageSize}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt>Signatures</dt>
                        <dd>{theme.signatureLayout.replaceAll("_", " ")}</dd>
                      </div>
                    </dl>
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button disabled={savingBrand} onClick={() => void saveBranding()}>
                {savingBrand ? "Saving…" : "Save default branding"}
              </Button>
              <p className="text-[12px] text-muted-foreground">
                Active default: {selectedTheme?.name ?? companyState.defaultThemeId.replaceAll("_", " ")}
              </p>
            </div>
          </Tile>
        </Bento>

        <Bento>
          <Tile kicker="Letterhead assets" span={2}>
            <p className="mt-3 text-sm text-muted-foreground">
              Logos, seal, and CEO signature are pulled from signed Amplify agreements and swap automatically with dark
              or light document fields.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <AssetPreview label="Logo · dark field" src={darkAssets.logo} dark />
              <AssetPreview label="Logo · light field" src={lightAssets.logo} />
              <AssetPreview label="Seal · dark field" src={darkAssets.seal} dark />
              <AssetPreview label="Seal · light field" src={lightAssets.seal} />
              <AssetPreview label="Signature · cyan ink" src={darkAssets.signature} dark />
              <AssetPreview label="Signature · black ink" src={lightAssets.signature} />
            </div>
          </Tile>
          <Tile kicker="Identity on PDFs">
            <MetaList
              rows={[
                ["Signatory", companyState.authorizedSignatory],
                ["Title", companyState.authorizedSignatoryTitle],
                ["Accent", selectedTheme?.accentColor ?? "—"],
                ["Heading", selectedTheme?.headingFont ?? "—"],
                ["Body", selectedTheme?.bodyFont ?? "—"],
              ]}
            />
          </Tile>
        </Bento>
      </TabsContent>

      <TabsContent value="appearance" className="mt-6">
        <AppearancePanel selectedTheme={selectedTheme} />
      </TabsContent>

      <TabsContent value="users" className="mt-6">
        <UsersDirectory users={users} canManage={canManageUsers} currentUserId={currentUserId} />
      </TabsContent>

      <TabsContent value="defaults" className="mt-6 space-y-3">
        <Bento>
          <Tile kicker="Generation defaults" span={2}>
            <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-muted-foreground">
              These values pre-fill the generate wizard when a template does not override them. They apply to new
              employment and client agreements.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Jurisdiction">
                <Input
                  value={companyState.defaultJurisdiction}
                  onChange={(e) => setCompanyState({ ...companyState, defaultJurisdiction: e.target.value })}
                  placeholder="Pakistan"
                />
              </Field>
              <Field label="Currency">
                <Input
                  value={companyState.defaultCurrency}
                  onChange={(e) => setCompanyState({ ...companyState, defaultCurrency: e.target.value.toUpperCase() })}
                  placeholder="PKR"
                />
              </Field>
              <Field label="Notice period (days)">
                <Input
                  type="number"
                  min={1}
                  value={companyState.defaultNoticePeriodDays}
                  onChange={(e) =>
                    setCompanyState({
                      ...companyState,
                      defaultNoticePeriodDays: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                />
              </Field>
              <Field label="Probation (days)">
                <Input
                  type="number"
                  min={1}
                  value={companyState.defaultProbationDays ?? 30}
                  onChange={(e) =>
                    setCompanyState({
                      ...companyState,
                      defaultProbationDays: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                />
              </Field>
              <Field label="Default work mode">
                <select
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={companyState.defaultWorkMode ?? "hybrid"}
                  onChange={(e) =>
                    setCompanyState({
                      ...companyState,
                      defaultWorkMode: e.target.value as CompanySettings["defaultWorkMode"],
                    })
                  }
                >
                  <option value="on_site">On site</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="flexible">Flexible</option>
                </select>
              </Field>
              <Field label="Preferred page size">
                <select
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={companyState.defaultPageSize ?? "A4"}
                  onChange={(e) =>
                    setCompanyState({
                      ...companyState,
                      defaultPageSize: e.target.value as CompanySettings["defaultPageSize"],
                    })
                  }
                >
                  <option value="A4">A4</option>
                  <option value="Letter">Letter</option>
                </select>
              </Field>
            </div>

            <div className="mt-6">
              <p className="text-[12px] text-muted-foreground">Quick jurisdictions</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {["Pakistan", "United Arab Emirates", "Florida, USA", "California, USA", "England and Wales"].map(
                  (place) => (
                    <button
                      key={place}
                      type="button"
                      onClick={() => setCompanyState({ ...companyState, defaultJurisdiction: place })}
                      className={`rounded-md border px-2.5 py-1 text-[12px] transition-colors ${
                        companyState.defaultJurisdiction === place
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                    >
                      {place}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="mt-5">
              <p className="text-[12px] text-muted-foreground">Quick currencies</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {["PKR", "USD", "AED", "GBP", "EUR"].map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setCompanyState({ ...companyState, defaultCurrency: code })}
                    className={`rounded-md border px-2.5 py-1 font-mono text-[12px] transition-colors ${
                      companyState.defaultCurrency === code
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <p className="text-[12px] text-muted-foreground">Notice period presets</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[15, 30, 45, 60, 90].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setCompanyState({ ...companyState, defaultNoticePeriodDays: days })}
                    className={`rounded-md border px-2.5 py-1 text-[12px] transition-colors ${
                      companyState.defaultNoticePeriodDays === days
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    {days} days
                  </button>
                ))}
              </div>
            </div>

            <Button className="mt-6" disabled={savingDefaults} onClick={() => void saveDefaults()}>
              {savingDefaults ? "Saving…" : "Save document defaults"}
            </Button>
          </Tile>

          <Tile kicker="Applied to">
            <MetaList
              rows={[
                ["Jurisdiction", companyState.defaultJurisdiction],
                ["Currency", companyState.defaultCurrency],
                ["Notice", `${companyState.defaultNoticePeriodDays} days`],
                ["Probation", `${companyState.defaultProbationDays ?? 30} days`],
                ["Work mode", (companyState.defaultWorkMode ?? "hybrid").replaceAll("_", " ")],
                ["Page size", companyState.defaultPageSize ?? "A4"],
              ]}
            />
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              Letterhead branding stays on the Branding tab. Signing expiry and OTP stay on Signing.
            </p>
          </Tile>
        </Bento>
      </TabsContent>

      <TabsContent value="signing" className="mt-6 space-y-3">
        <Bento>
          <Tile kicker="Signing defaults" span={2}>
            <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-muted-foreground">
              Applied when a template does not set its own signature config. New sends pick up expiry, order, and
              client OTP from here.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Expiry (days)">
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={signingState.defaultExpiryDays}
                  onChange={(e) =>
                    setSigningState({
                      ...signingState,
                      defaultExpiryDays: Math.min(90, Math.max(1, Number(e.target.value) || 1)),
                    })
                  }
                />
              </Field>
              <Field label="Signing order">
                <select
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={signingState.defaultOrder}
                  onChange={(e) =>
                    setSigningState({
                      ...signingState,
                      defaultOrder: e.target.value as SigningOrder,
                    })
                  }
                >
                  {ORDER_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="mt-6">
              <p className="text-[12px] text-muted-foreground">Quick expiry</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {EXPIRY_PRESETS.map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setSigningState({ ...signingState, defaultExpiryDays: days })}
                    className={`rounded-md border px-2.5 py-1 text-[12px] transition-colors ${
                      signingState.defaultExpiryDays === days
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    {days} days
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <p className="text-[12px] text-muted-foreground">Order</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {ORDER_OPTIONS.map((option) => {
                  const selected = signingState.defaultOrder === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setSigningState({ ...signingState, defaultOrder: option.id })}
                      className={`rounded-md border px-3 py-3 text-left transition-colors ${
                        selected
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background hover:bg-muted/50"
                      }`}
                    >
                      <div className="text-[13px] font-medium">{option.label}</div>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{option.hint}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3">
                <div>
                  <p className="text-[13px] font-medium">OTP for client agreements</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    Require a one-time code when the counterparty is a client.
                  </p>
                </div>
                <Switch
                  checked={signingState.requireOtpForClientAgreements}
                  onCheckedChange={(checked) =>
                    setSigningState({ ...signingState, requireOtpForClientAgreements: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3">
                <div>
                  <p className="text-[13px] font-medium">Allow draft download</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    Let recipients download the unsigned draft from the signing page.
                  </p>
                </div>
                <Switch
                  checked={signingState.allowDraftDownload}
                  onCheckedChange={(checked) =>
                    setSigningState({ ...signingState, allowDraftDownload: checked })
                  }
                />
              </div>
            </div>

            <Button className="mt-6" disabled={savingSigning} onClick={() => void saveSigning()}>
              {savingSigning ? "Saving…" : "Save signing"}
            </Button>
          </Tile>
          <Tile kicker="Links">
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Signing URLs prefer the request host so LAN Network links stay shareable.
            </p>
            <MetaList
              rows={[
                ["Expiry", `${signingState.defaultExpiryDays} days`],
                ["Order", signingState.defaultOrder.replaceAll("_", " ")],
                ["OTP for clients", signingState.requireOtpForClientAgreements ? "on" : "off"],
                ["Draft download", signingState.allowDraftDownload ? "on" : "off"],
              ]}
            />
          </Tile>
        </Bento>
      </TabsContent>

      <TabsContent value="email" className="mt-6 space-y-3">
        <Bento>
          <Tile kicker="Sender & notifications" span={2}>
            <Stat
              value={email.configured ? "Live" : "Console"}
              size="md"
              hint={
                email.configured
                  ? "Resend will deliver signing emails."
                  : "Messages are logged to the server until EMAIL_API_KEY is set."
              }
            />
            <p className="mt-4 max-w-[52ch] text-sm leading-relaxed text-muted-foreground">
              From address and notification preferences live here. Provider and API key stay in env so secrets never
              land in the workspace store.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="From name">
                <Input
                  value={emailState.fromName}
                  onChange={(e) => setEmailState({ ...emailState, fromName: e.target.value })}
                  placeholder="Amplify Media"
                />
              </Field>
              <Field label="From address">
                <Input
                  type="email"
                  value={emailState.fromAddress}
                  onChange={(e) => setEmailState({ ...emailState, fromAddress: e.target.value })}
                  placeholder="contracts@company.com"
                />
              </Field>
              <Field label="Reply-to">
                <Input
                  type="email"
                  value={emailState.replyTo}
                  onChange={(e) => setEmailState({ ...emailState, replyTo: e.target.value })}
                  placeholder="ops@company.com"
                />
              </Field>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    setEmailState({
                      ...emailState,
                      fromName: companyState.displayName,
                      fromAddress: companyState.email,
                      replyTo: companyState.email,
                    })
                  }
                >
                  Use company email
                </Button>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3">
                <div>
                  <p className="text-[13px] font-medium">Notify on recipient signature</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    Email the company address when a party signs and countersignature is needed.
                  </p>
                </div>
                <Switch
                  checked={emailState.notifyInternalOnSign}
                  onCheckedChange={(checked) =>
                    setEmailState({ ...emailState, notifyInternalOnSign: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3">
                <div>
                  <p className="text-[13px] font-medium">Notify recipient on completion</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    Send a completion email after the agreement is finalized.
                  </p>
                </div>
                <Switch
                  checked={emailState.notifyRecipientOnComplete}
                  onCheckedChange={(checked) =>
                    setEmailState({ ...emailState, notifyRecipientOnComplete: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3">
                <div>
                  <p className="text-[13px] font-medium">Signing reminders</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    Allow reminder emails for outstanding signature requests.
                  </p>
                </div>
                <Switch
                  checked={emailState.sendReminders}
                  onCheckedChange={(checked) =>
                    setEmailState({ ...emailState, sendReminders: checked })
                  }
                />
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
              <Field label="Send test to">
                <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@company.com" />
              </Field>
              <div className="flex items-end gap-2">
                <Button
                  disabled={testing || !testTo}
                  variant="outline"
                  onClick={() => {
                    setTesting(true);
                    void sendTestEmailAction(testTo)
                      .then((result) => {
                        if (result.delivered) toast.success(`Test email sent via ${result.provider}`);
                        else toast.message("Test logged to console — set EMAIL_API_KEY for delivery");
                      })
                      .catch((error) => toast.error(error instanceof Error ? error.message : "Test email failed"))
                      .finally(() => setTesting(false));
                  }}
                >
                  {testing ? "Sending…" : "Send test"}
                </Button>
              </div>
            </div>

            <Button className="mt-6" disabled={savingEmail} onClick={() => void saveEmail()}>
              {savingEmail ? "Saving…" : "Save email"}
            </Button>
          </Tile>
          <Tile kicker="Transport">
            <MetaList
              rows={[
                ["Provider", email.provider],
                ["From", liveFrom],
                ["Reply-to", emailState.replyTo || "—"],
                ["Internal notify", emailState.notifyInternalOnSign ? "on" : "off"],
                ["Completion mail", emailState.notifyRecipientOnComplete ? "on" : "off"],
              ]}
            />
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              Set `EMAIL_PROVIDER=resend`, `EMAIL_API_KEY`, and optionally `EMAIL_FROM` in `.env.local` or Vercel env.
              Workspace from/reply-to override the display identity when set.
            </p>
          </Tile>
        </Bento>
      </TabsContent>

      <TabsContent value="ai" className="mt-6 space-y-3">
        <Bento>
          <Tile kicker="Assistance" span={2}>
            <div className="mb-3">
              <AiHint>AI features</AiHint>
            </div>
            <Stat
              value={aiLive ? "On" : aiConfigured ? "Standby" : "No key"}
              size="md"
              hint={
                aiLive
                  ? "Optional AI overlays run when a feature below is enabled. UI surfaces label AI suggestions."
                  : aiConfigured
                    ? "API key is present. Turn on assistance to use feature flags."
                    : "Set GEMINI_API_KEY in env (Google AI Studio free tier). Document generation works without AI."
              }
            />
            <p className="mt-4 max-w-[52ch] text-sm leading-relaxed text-muted-foreground">
              Uses Gemini (`gemini-2.5-flash` by default). AI never invents approved legal wording. Templates and
              clauses stay library-sourced; AI only recommends, extracts, summarizes, or compares. Anywhere Gemini
              contributes, the UI shows an AI suggestion label.
            </p>

            <div className="mt-6 space-y-3">
              <AiToggle
                label="AI assistance enabled"
                hint="Master switch. When off, every AI call is skipped and rules/history still run."
                checked={aiState.enabled}
                onChange={(enabled) => setAiState({ ...aiState, enabled })}
              />
              <AiToggle
                label="Analyze uploaded contracts"
                hint="Structure knowledge uploads (type, parties, clause hints)."
                checked={aiState.analyzeUploads}
                disabled={!aiState.enabled}
                onChange={(analyzeUploads) => setAiState({ ...aiState, analyzeUploads })}
              />
              <AiToggle
                label="Recommend templates"
                hint="Suggest a library template after deterministic rules in Generate."
                checked={aiState.recommendTemplates}
                disabled={!aiState.enabled}
                onChange={(recommendTemplates) => setAiState({ ...aiState, recommendTemplates })}
              />
              <AiToggle
                label="Recommend PDF themes"
                hint="On each document, AI suggests one letterhead — the catalog is not listed there."
                checked={aiState.recommendThemes ?? true}
                disabled={!aiState.enabled}
                onChange={(recommendThemes) => setAiState({ ...aiState, recommendThemes })}
              />
              <AiToggle
                label="Recommend clauses"
                hint="Suggest existing clause ids for a pack — never free-write clause text."
                checked={aiState.recommendClauses}
                disabled={!aiState.enabled}
                onChange={(recommendClauses) => setAiState({ ...aiState, recommendClauses })}
              />
              <AiToggle
                label="Extract document information"
                hint="Pull fields (title, pay, probation) from pasted or uploaded text."
                checked={aiState.extractFields}
                disabled={!aiState.enabled}
                onChange={(extractFields) => setAiState({ ...aiState, extractFields })}
              />
              <AiToggle
                label="Compare documents"
                hint="Narrative diff beside the deterministic text compare tool."
                checked={aiState.compareDocuments}
                disabled={!aiState.enabled}
                onChange={(compareDocuments) => setAiState({ ...aiState, compareDocuments })}
              />
              <AiToggle
                label="Generate summaries"
                hint="Short plain-language summary of an assembled agreement."
                checked={aiState.generateSummaries}
                disabled={!aiState.enabled}
                onChange={(generateSummaries) => setAiState({ ...aiState, generateSummaries })}
              />
              <AiToggle
                label="Dashboard insights"
                hint="Gemini reads today’s workspace metrics and suggests what to clear next."
                checked={aiState.dashboardInsights ?? true}
                disabled={!aiState.enabled}
                onChange={(dashboardInsights) => setAiState({ ...aiState, dashboardInsights })}
              />
              <div className="rounded-md border border-border px-4 py-3 opacity-70">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[13px] font-medium">Draft new legal clauses</p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      Locked off. ContractOS will not let the model invent clause wording.
                    </p>
                  </div>
                  <Switch checked={false} disabled />
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Monthly warning ($)">
                <Input
                  type="number"
                  min={0}
                  step={5}
                  value={aiState.monthlySpendingWarningUsd}
                  onChange={(e) =>
                    setAiState({
                      ...aiState,
                      monthlySpendingWarningUsd: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                />
              </Field>
              <Field label="Hard limit ($)">
                <Input
                  type="number"
                  min={0}
                  step={5}
                  value={aiState.hardSpendingLimitUsd}
                  onChange={(e) =>
                    setAiState({
                      ...aiState,
                      hardSpendingLimitUsd: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                />
              </Field>
            </div>

            <Button className="mt-6" disabled={savingAi} onClick={() => void saveAi()}>
              {savingAi ? "Saving…" : "Save AI settings"}
            </Button>
          </Tile>
          <Tile kicker="Usage">
            <MetaList
              rows={[
                ["Provider", "Gemini"],
                ["API key", aiConfigured ? "configured" : "missing"],
                ["Input tokens", usage.inputTokens],
                ["Output tokens", usage.outputTokens],
                ["Estimated cost", `$${usage.estimatedCostUsd.toFixed(2)}`],
                ["Requests", usage.requests],
                ["Spend used", `${spendPct}% of hard limit`],
              ]}
            />
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${spendPct}%` }}
              />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Free-tier Gemini still counts toward request quotas. Soft warning at $
              {aiState.monthlySpendingWarningUsd}; hard stop at ${aiState.hardSpendingLimitUsd}. Generation,
              signing, and library flows keep working when AI is off.
            </p>
          </Tile>
        </Bento>
      </TabsContent>

      <TabsContent value="security" className="mt-6 space-y-3">
        <Bento>
          <Tile kicker="Session & passwords" span={2}>
            <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-muted-foreground">
              Controls how long staff stay signed in and how strong new passwords must be. Signing-link crypto and
              permission checks stay fixed in code.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Session length (days)">
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={securityState.sessionDays}
                  onChange={(e) =>
                    setSecurityState({
                      ...securityState,
                      sessionDays: Math.min(90, Math.max(1, Number(e.target.value) || 1)),
                    })
                  }
                />
              </Field>
              <Field label="Minimum password length">
                <Input
                  type="number"
                  min={8}
                  max={128}
                  value={securityState.minPasswordLength}
                  onChange={(e) =>
                    setSecurityState({
                      ...securityState,
                      minPasswordLength: Math.min(128, Math.max(8, Number(e.target.value) || 8)),
                    })
                  }
                />
              </Field>
            </div>

            <div className="mt-6">
              <p className="text-[12px] text-muted-foreground">Quick session length</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {SESSION_PRESETS.map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setSecurityState({ ...securityState, sessionDays: days })}
                    className={`rounded-md border px-2.5 py-1 text-[12px] transition-colors ${
                      securityState.sessionDays === days
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    {days} day{days === 1 ? "" : "s"}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <AiToggle
                label="Require mixed case"
                hint="New passwords must include upper and lower case letters."
                checked={securityState.requireMixedCase}
                onChange={(requireMixedCase) => setSecurityState({ ...securityState, requireMixedCase })}
              />
              <AiToggle
                label="Require a digit"
                hint="New passwords must include at least one number."
                checked={securityState.requireDigit}
                onChange={(requireDigit) => setSecurityState({ ...securityState, requireDigit })}
              />
              <AiToggle
                label="Require a symbol"
                hint="New passwords must include a non-alphanumeric character."
                checked={securityState.requireSymbol}
                onChange={(requireSymbol) => setSecurityState({ ...securityState, requireSymbol })}
              />
            </div>

            <Button className="mt-6" disabled={savingSecurity} onClick={() => void saveSecurity()}>
              {savingSecurity ? "Saving…" : "Save security"}
            </Button>
          </Tile>
          <Tile kicker="Runtime">
            <MetaList
              rows={[
                ["SESSION_SECRET", security.sessionSecretConfigured ? "set" : "missing"],
                ["Environment", security.production ? "production" : "development"],
                ["Secure cookies", security.secureCookies ? "on" : "dev only"],
                ["Data adapter", security.dataAdapter],
                ["Firebase", security.firebaseConfigured ? "configured" : "n/a"],
                ["Session", `${securityState.sessionDays} days`],
                ["Min password", `${securityState.minPasswordLength} chars`],
              ]}
            />
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              Permissions are enforced in server actions. Signing links use hashed random tokens. Final PDFs are stored
              outside Firestore. Audit events are append-only.
            </p>
            {!security.sessionSecretConfigured && security.production ? (
              <p className="mt-3 text-sm text-destructive">
                Set a real SESSION_SECRET before shipping — the placeholder is not safe.
              </p>
            ) : null}
          </Tile>
        </Bento>
      </TabsContent>
    </Tabs>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function AiToggle({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3 ${disabled ? "opacity-60" : ""}`}>
      <div>
        <p className="text-[13px] font-medium">{label}</p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}

function AssetPreview({ label, src, dark = false }: { label: string; src: string; dark?: boolean }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <div
        className="mt-2 flex h-20 items-center justify-center rounded-sm border border-border px-3"
        style={{ background: dark ? "#0c0d0b" : "#f4f4ef" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={label} className="max-h-14 max-w-full object-contain" />
      </div>
    </div>
  );
}
