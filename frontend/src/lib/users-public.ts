import type { OrgUser } from "@/lib/validation/schemas";

export type PublicOrgUser = Omit<OrgUser, "passwordHash">;

/** Strip password hashes before sending users to the client. */
export function toPublicUser(user: OrgUser): PublicOrgUser {
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
}
