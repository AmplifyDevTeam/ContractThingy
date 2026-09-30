function getByPath(source: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    if (typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, source);
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2025-08-12" → "12 August 2025" (timezone-safe; no Date parsing). */
export function formatIsoDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return value;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return value;
  return `${Number(match[3])} ${month} ${match[1]}`;
}

const FREQUENCY_PHRASE: Record<string, string> = {
  hourly: "hour",
  daily: "day",
  weekly: "week",
  biweekly: "two weeks",
  monthly: "month",
  annual: "year",
  annually: "year",
  yearly: "year",
};

export function frequencyPhrase(frequency: unknown): string {
  const key = String(frequency ?? "monthly").toLowerCase();
  return FREQUENCY_PHRASE[key] ?? key;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map((item) => formatValue(item)).join(", ");
  if (typeof value === "number") {
    return new Intl.NumberFormat("en-US").format(value);
  }
  if (typeof value === "object") return "";
  return formatIsoDate(String(value));
}

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function formatDays(days: unknown): string {
  if (!Array.isArray(days) || days.length === 0) return "";
  const names = days.map(String);
  const indexes = names.map((day) => DAY_ORDER.indexOf(day));
  const contiguous =
    names.length >= 3 &&
    indexes.every((value) => value >= 0) &&
    indexes.every((value, i) => i === 0 || value === indexes[i - 1] + 1);
  return contiguous ? `${names[0]} to ${names[names.length - 1]}` : names.join(", ");
}

function formatTime(raw: unknown): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(raw ?? ""));
  if (!match) return String(raw ?? "");
  const hours = Number(match[1]);
  const suffix = hours >= 12 ? "PM" : "AM";
  const twelve = hours % 12 === 0 ? 12 : hours % 12;
  return `${twelve}:${match[2]} ${suffix}`;
}

function workModeLabel(mode: unknown): string {
  const key = String(mode ?? "");
  if (key === "on_site") return "on site";
  return key.replaceAll("_", " ");
}

function formatCurrency(amount: unknown, currency: unknown): string {
  const n = typeof amount === "number" ? amount : Number(amount ?? 0);
  const code = typeof currency === "string" && currency ? currency : "PKR";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${code} ${new Intl.NumberFormat("en-US").format(n)}`;
  }
}

export function interpolate(template: string, context: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, raw: string) => {
    const expr = raw.trim();
    if (expr === "compensation.display") {
      const salary = getByPath(context, "compensation.salary") as
        | { amount?: number; currency?: string; frequency?: string }
        | undefined;
      if (!salary) return "";
      return `${formatCurrency(salary.amount, salary.currency)} per ${frequencyPhrase(salary.frequency)}`;
    }
    if (expr === "responsibilities.list") {
      const items = getByPath(context, "responsibilities");
      if (!Array.isArray(items) || items.length === 0) return "";
      return `<ul>${items.map((item) => `<li>${escapeHtml(String(item))}</li>`).join("")}</ul>`;
    }
    if (expr === "schedule.days") {
      return escapeHtml(formatDays(getByPath(context, "workingSchedule.workingDays")));
    }
    if (expr === "schedule.hours") {
      const start = getByPath(context, "workingSchedule.startTime");
      const end = getByPath(context, "workingSchedule.endTime");
      return escapeHtml(`${formatTime(start)} to ${formatTime(end)}`);
    }
    if (expr === "schedule.mode") {
      return escapeHtml(workModeLabel(getByPath(context, "workingSchedule.workMode")));
    }
    if (expr === "schedule.summary") {
      // Legacy token (working-hours clause v1): hours and work mode only; days are listed separately.
      const days = formatDays(getByPath(context, "workingSchedule.workingDays"));
      const start = getByPath(context, "workingSchedule.startTime");
      const end = getByPath(context, "workingSchedule.endTime");
      const mode = workModeLabel(getByPath(context, "workingSchedule.workMode"));
      return escapeHtml(`${days}, ${formatTime(start)} to ${formatTime(end)}${mode ? ` (${mode})` : ""}`);
    }
    if (expr === "address.full") {
      const addr = getByPath(context, "person.residentialAddress") as
        | { line1?: string; city?: string; state?: string; country?: string }
        | undefined;
      if (!addr) return "";
      return escapeHtml([addr.line1, addr.city, addr.state, addr.country].filter(Boolean).join(", "));
    }
    if (expr === "company.address") {
      const addr = getByPath(context, "company.address") as
        | { line1?: string; city?: string; state?: string; country?: string }
        | undefined;
      if (!addr) return escapeHtml(String(getByPath(context, "company.primaryAddress.line1") ?? ""));
      return escapeHtml([addr.line1, addr.city, addr.state, addr.country].filter(Boolean).join(", "));
    }
    // Every other value is data: always escaped, never raw HTML.
    const value = getByPath(context, expr);
    return escapeHtml(formatValue(value));
  });
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatMoney(amount: number, currency: string): string {
  return formatCurrency(amount, currency);
}
