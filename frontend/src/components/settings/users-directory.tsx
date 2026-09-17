"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PencilIcon, PlusIcon, ShieldIcon } from "lucide-react";
import { Bento, Stat, Tile } from "@/components/bento";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  createOrgUserAction,
  updateOrgUserAction,
} from "@/lib/actions/users";
import type { PublicOrgUser } from "@/lib/users-public";
import { permissionsFor } from "@/lib/auth/permissions";
import { USER_ROLES, type UserRole } from "@/lib/types/enums";
import { cn } from "@/lib/utils";

const ROLE_BLURBS: Record<UserRole, string> = {
  SUPER_ADMIN: "Full access — settings, users, and every workspace action.",
  ADMIN_HR: "People, clients, documents, and signing — no library writes.",
  LEGAL_ADMIN: "Templates, clauses, knowledge, and packs.",
  MANAGER: "Create and approve docs for their team; read-only library.",
  VIEWER: "Read-only across people, clients, and documents.",
};

type FormState = {
  id?: string;
  displayName: string;
  email: string;
  role: UserRole;
  active: boolean;
  password: string;
};

const EMPTY_FORM: FormState = {
  displayName: "",
  email: "",
  role: "VIEWER",
  active: true,
  password: "",
};

function roleLabel(role: UserRole) {
  return role.replaceAll("_", " ");
}

export function UsersDirectory({
  users: initialUsers,
  canManage,
  currentUserId,
}: {
  users: PublicOrgUser[];
  canManage: boolean;
  currentUserId: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const editing = Boolean(form.id);

  const activeCount = users.filter((user) => user.active).length;
  const byRole = useMemo(() => {
    const counts = Object.fromEntries(USER_ROLES.map((role) => [role, 0])) as Record<
      UserRole,
      number
    >;
    for (const user of users) counts[user.role] += 1;
    return counts;
  }, [users]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function openEdit(user: PublicOrgUser) {
    setForm({
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      active: user.active,
      password: "",
    });
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    try {
      if (editing && form.id) {
        const updated = await updateOrgUserAction({
          id: form.id,
          displayName: form.displayName,
          email: form.email,
          role: form.role,
          active: form.active,
          password: form.password,
        });
        setUsers((prev) => prev.map((user) => (user.id === updated.id ? updated : user)));
        toast.success("User updated");
      } else {
        const created = await createOrgUserAction({
          displayName: form.displayName,
          email: form.email,
          role: form.role,
          active: form.active,
          password: form.password,
        });
        setUsers((prev) => [...prev, created].sort((a, b) => a.displayName.localeCompare(b.displayName)));
        toast.success("User created");
      }
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save user");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Bento>
        <Tile kicker="Directory" span={2}>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-[48ch] text-sm text-muted-foreground">
              Workspace logins and roles. Passwords are stored hashed; invite people with a temporary password
              and have them change it after first sign-in.
            </p>
            {canManage ? (
              <Button type="button" size="sm" className="gap-1.5" onClick={openCreate}>
                <PlusIcon className="size-3.5" />
                Add user
              </Button>
            ) : null}
          </div>
          <div className="mt-2">
            {users.map((user, index) => (
              <div
                key={user.id}
                className="flex items-center justify-between gap-3 border-b border-border py-4 last:border-b-0"
              >
                <div className="flex min-w-0 gap-3">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{user.displayName}</span>
                      {!user.active ? (
                        <span className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                          Inactive
                        </span>
                      ) : null}
                      {user.id === currentUserId ? (
                        <span className="rounded-sm bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-primary uppercase">
                          You
                        </span>
                      ) : null}
                    </div>
                    <div className="truncate text-sm text-muted-foreground">{user.email}</div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-right">
                    <div className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
                      {roleLabel(user.role)}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                      {permissionsFor(user.role).length} perms
                    </div>
                  </div>
                  {canManage ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label={`Edit ${user.displayName}`}
                      onClick={() => openEdit(user)}
                    >
                      <PencilIcon className="size-3.5" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Tile>
        <Tile kicker="Seats">
          <Stat value={users.length} size="md" />
          <p className="mt-3 text-[12px] text-muted-foreground">
            {activeCount} active · {users.length - activeCount} inactive
          </p>
          <dl className="mt-5 space-y-2 text-[12px] text-muted-foreground">
            {USER_ROLES.map((role) => (
              <div key={role} className="flex justify-between gap-2">
                <dt className="uppercase tracking-wide font-mono text-[10px]">{roleLabel(role)}</dt>
                <dd className="tabular-nums text-foreground">{byRole[role]}</dd>
              </div>
            ))}
          </dl>
        </Tile>
        <Tile kicker="Role guide" span={3}>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {USER_ROLES.map((role) => (
              <div key={role} className="rounded-md border border-border px-4 py-3">
                <div className="flex items-center gap-2 text-[13px] font-medium">
                  <ShieldIcon className="size-3.5 text-muted-foreground" />
                  {roleLabel(role)}
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{ROLE_BLURBS[role]}</p>
                <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                  {permissionsFor(role).length} permissions
                </p>
              </div>
            ))}
          </div>
        </Tile>
      </Bento>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit user" : "Add user"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update name, role, or set a new password. Leave password blank to keep the current one."
                : "Create a workspace login. They can sign in immediately with the password you set."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-1">
            <div className="grid gap-2">
              <Label htmlFor="user-name">Display name</Label>
              <Input
                id="user-name"
                value={form.displayName}
                onChange={(e) => setForm((prev) => ({ ...prev, displayName: e.target.value }))}
                placeholder="Jordan Malik"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="you@company.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="user-role">Role</Label>
              <select
                id="user-role"
                value={form.role}
                onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as UserRole }))}
                className={cn(
                  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none",
                  "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                )}
              >
                {USER_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {roleLabel(role)}
                  </option>
                ))}
              </select>
              <p className="text-[12px] text-muted-foreground">{ROLE_BLURBS[form.role]}</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="user-password">
                {editing ? "New password (optional)" : "Temporary password"}
              </Label>
              <Input
                id="user-password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder={editing ? "Leave blank to keep current" : "At least 8 characters"}
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5">
              <div>
                <div className="text-[13px] font-medium">Active</div>
                <div className="text-[12px] text-muted-foreground">Inactive users cannot sign in</div>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={(active) => setForm((prev) => ({ ...prev, active }))}
                disabled={editing && form.id === currentUserId}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                saving ||
                !form.displayName.trim() ||
                !form.email.trim() ||
                (!editing && form.password.length < 8)
              }
              onClick={() => void save()}
            >
              {saving ? "Saving…" : editing ? "Save changes" : "Create user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
