function getByPath(source: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    if (typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, source);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map((item) => formatValue(item)).join(", ");
  if (typeof value === "number") {
    return new Intl.NumberFormat("en-US").format(value);
  }
  return String(value);
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
      return `${formatCurrency(salary.amount, salary.currency)} per ${salary.frequency ?? "month"}`;
    }
    if (expr === "responsibilities.list") {
      const items = getByPath(context, "responsibilities");
      if (!Array.isArray(items) || items.length === 0) return "";
      return `<ul>${items.map((item) => `<li>${escapeHtml(String(item))}</li>`).join("")}</ul>`;
    }
    if (expr === "schedule.summary") {
      const days = getByPath(context, "workingSchedule.workingDays");
      const start = getByPath(context, "workingSchedule.startTime");
      const end = getByPath(context, "workingSchedule.endTime");
      const mode = getByPath(context, "workingSchedule.workMode");
      const dayText = Array.isArray(days) ? days.join(", ") : "";
      return `${dayText}, ${String(start ?? "")}–${String(end ?? "")} (${String(mode ?? "").replaceAll("_", " ")})`;
    }
    if (expr === "address.full") {
      const addr = getByPath(context, "person.residentialAddress") as
        | { line1?: string; city?: string; state?: string; country?: string }
        | undefined;
      if (!addr) return "";
      return [addr.line1, addr.city, addr.state, addr.country].filter(Boolean).join(", ");
    }
    if (expr === "company.address") {
      const addr = getByPath(context, "company.address") as
        | { line1?: string; city?: string; state?: string; country?: string }
        | undefined;
      if (!addr) return String(getByPath(context, "company.primaryAddress.line1") ?? "");
      return [addr.line1, addr.city, addr.state, addr.country].filter(Boolean).join(", ");
    }
    const value = getByPath(context, expr);
    if (typeof value === "string" && value.includes("<")) return value;
    return escapeHtml(formatValue(value));
  });
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function formatMoney(amount: number, currency: string): string {
  return formatCurrency(amount, currency);
}
