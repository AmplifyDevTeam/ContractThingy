"use server";

import { toResult } from "@/lib/actions/result";

import { apiPatch, apiPost } from "@/lib/api";
import type { PublicOrgUser } from "@/lib/users-public";

async function createOrgUserAction__impl(input: unknown): Promise<PublicOrgUser> {
  const data = await apiPost<{ user: PublicOrgUser }>("/users", input);
  return data.user;
}

async function updateOrgUserAction__impl(
  input: { id: string } & Record<string, unknown>,
): Promise<PublicOrgUser> {
  const { id, ...patch } = input;
  const data = await apiPatch<{ user: PublicOrgUser }>(`/users/${id}`, patch);
  return data.user;
}

// ── Public actions (return ActionResult; see lib/actions/result.ts) ──
export async function createOrgUserAction(...args: Parameters<typeof createOrgUserAction__impl>) {
  return toResult(() => createOrgUserAction__impl(...args));
}
export async function updateOrgUserAction(...args: Parameters<typeof updateOrgUserAction__impl>) {
  return toResult(() => updateOrgUserAction__impl(...args));
}
