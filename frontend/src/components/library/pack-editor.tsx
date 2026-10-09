"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updatePackAction } from "@/lib/actions/client";
import type { DocumentPack, Template } from "@/lib/types";

export function PackEditor({ pack, templates }: { pack: DocumentPack; templates: Template[] }) {
  const router = useRouter();
  const [name, setName] = useState(pack.name);
  const [description, setDescription] = useState(pack.description);
  const [templateIds, setTemplateIds] = useState<string[]>(pack.templateIds);
  const [busy, setBusy] = useState(false);

  function toggle(id: string) {
    setTemplateIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function save() {
    setBusy(true);
    try {
      await updatePackAction(pack.id, {
        name: name.trim(),
        description: description.trim(),
        templateIds,
      });
      toast.success("Pack saved");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save pack");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor={`pack-name-${pack.id}`}>Name</Label>
        <Input
          id={`pack-name-${pack.id}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`pack-description-${pack.id}`}>Description</Label>
        <Textarea
          id={`pack-description-${pack.id}`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <p className="text-[12px] text-muted-foreground">Templates in this pack</p>
        <ul className="space-y-2 text-sm">
          {templates.map((template) => {
            const checked = templateIds.includes(template.id);
            return (
              <li key={template.id}>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(template.id)}
                    className="size-4 accent-primary"
                  />
                  <span>{template.name}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
      <Button type="button" onClick={save} disabled={busy || !name.trim() || templateIds.length === 0}>
        {busy ? "Saving…" : "Save pack"}
      </Button>
    </div>
  );
}
