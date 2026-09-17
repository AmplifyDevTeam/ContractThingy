/** Client-safe email helpers (transport lives on the API). */
export function formatEmailFrom(settings?: { fromName?: string; fromAddress?: string } | null): string {
  if (!settings?.fromAddress) return "ContractOS <contracts@amplifymediatechnologies.com>";
  if (settings.fromName) return `${settings.fromName} <${settings.fromAddress}>`;
  return settings.fromAddress;
}
