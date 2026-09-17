"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPersonAction, updatePersonAction } from "@/lib/actions/workspace";
import { EMPLOYMENT_STATUSES, PERSON_TYPES } from "@/lib/types/enums";
import type { Person } from "@/lib/types";

const STATUS_HINT: Record<string, string> = {
  active: "Currently employed",
  probation: "In a probation or trial period",
  on_leave: "Temporarily away",
  offer_pending: "Offer out, not started",
  resigned: "Left the company",
  terminated: "Employment ended by the company",
};

export function PersonForm({ person }: { person?: Person }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const editing = Boolean(person);

  async function onSubmit(formData: FormData) {
    setBusy(true);
    try {
      const firstName = String(formData.get("firstName") ?? "").trim();
      const lastName = String(formData.get("lastName") ?? "").trim();
      const payload = {
        firstName,
        lastName,
        email: String(formData.get("email") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        type: String(formData.get("type") ?? "employee"),
        currentJobTitle: String(formData.get("currentJobTitle") ?? ""),
        department: String(formData.get("department") ?? ""),
        reportingManager: String(formData.get("reportingManager") ?? ""),
        employmentStatus: String(formData.get("employmentStatus") ?? "active"),
        employmentStartDate: String(formData.get("employmentStartDate") ?? ""),
        currentSalary: Number(formData.get("currentSalary") ?? 0),
        salaryCurrency: String(formData.get("salaryCurrency") ?? "PKR"),
        employeeId: String(formData.get("employeeId") ?? ""),
        city: String(formData.get("city") ?? ""),
        notes: String(formData.get("notes") ?? ""),
      };
      if (editing && person) {
        const updated = await updatePersonAction({ id: person.id, ...payload });
        toast.success(
          updated.employmentStatus === "resigned" || updated.employmentStatus === "terminated"
            ? `${updated.fullLegalName} marked as ${updated.employmentStatus.replaceAll("_", " ")}`
            : `${updated.fullLegalName} updated`,
        );
        router.push(`/people/${person.id}`);
        router.refresh();
      } else {
        const created = await createPersonAction({
          ...payload,
          fullLegalName: `${firstName} ${lastName}`.trim(),
          country: "Pakistan",
          salaryFrequency: "monthly",
          middleName: "",
          fatherName: "",
          identityNumber: "",
          dateOfBirth: "",
          province: "",
          residentialAddress: { line1: "", line2: "", city: payload.city, state: "", postalCode: "", country: "Pakistan" },
          permanentAddress: { line1: "", line2: "", city: payload.city, state: "", postalCode: "", country: "Pakistan" },
        });
        toast.success("Person created");
        router.push(`/people/${created.id}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save person");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={onSubmit} className="max-w-2xl space-y-8">
      <section className="space-y-4">
        <h2 className="text-sm tracking-wide text-muted-foreground uppercase">Identity</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" name="firstName" defaultValue={person?.firstName} required />
          <Field label="Last name" name="lastName" defaultValue={person?.lastName} required />
          <Field label="Email" name="email" type="email" defaultValue={person?.email} required />
          <Field label="Phone" name="phone" defaultValue={person?.phone} />
          <SelectField label="Type" name="type" defaultValue={person?.type ?? "employee"}>
            {PERSON_TYPES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </SelectField>
          <Field label="Employee ID" name="employeeId" defaultValue={person?.employeeId} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm tracking-wide text-muted-foreground uppercase">Employment</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Status"
            name="employmentStatus"
            defaultValue={person?.employmentStatus ?? (editing ? "active" : "offer_pending")}
          >
            {EMPLOYMENT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value.replaceAll("_", " ")}
                {STATUS_HINT[value] ? ` — ${STATUS_HINT[value]}` : ""}
              </option>
            ))}
          </SelectField>
          <Field label="Start date" name="employmentStartDate" type="date" defaultValue={person?.employmentStartDate} />
          <Field label="Job title" name="currentJobTitle" defaultValue={person?.currentJobTitle} />
          <Field label="Department" name="department" defaultValue={person?.department} />
          <Field label="Reporting manager" name="reportingManager" defaultValue={person?.reportingManager} />
          <Field label="City" name="city" defaultValue={person?.city} />
          <Field label="Salary" name="currentSalary" type="number" defaultValue={person ? String(person.currentSalary) : "0"} />
          <Field label="Currency" name="salaryCurrency" defaultValue={person?.salaryCurrency ?? "PKR"} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={4}
            defaultValue={person?.notes}
            placeholder="Last day, handover, or reason for leaving"
          />
        </div>
      </section>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : editing ? "Save changes" : "Save person"}
        </Button>
        {editing && person ? (
          <Button type="button" variant="ghost" onClick={() => router.push(`/people/${person.id}`)}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required={required} defaultValue={defaultValue} />
    </div>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  children,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm"
      >
        {children}
      </select>
    </div>
  );
}
