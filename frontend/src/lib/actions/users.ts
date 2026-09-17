"use server";

import { apiPatch, apiPost } from "@/lib/api";
import type { PublicOrgUser } from "@/lib/users-public";

export async function createOrgUserAction(input: unknown): Promise<PublicOrgUser> {
  const data = await apiPost<{ user: PublicOrgUser }>("/users", input);
  return data.user;
}

export async function updateOrgUserAction(
  input: { id: string } & Record<string, unknown>,
): Promise<PublicOrgUser> {
  const { id, ...patch } = input;
  const data = await apiPatch<{ user: PublicOrgUser }>(`/users/${id}`, patch);
  return data.user;
}
