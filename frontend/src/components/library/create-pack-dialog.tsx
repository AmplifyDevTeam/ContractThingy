"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { createPackAction } from "@/lib/actions/client";
import type { Template } from "@/lib/types";

export function CreatePackDialog({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [templateIds, setTemplateIds] = useState<string[]>([]);

  function reset() {
    setName("");
    setDescription("");
    setTemplateIds([]);
  }

  function toggle(id: string) {
    setTemplateIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function save() {
    setBusy(true);
    try {
      await createPackAction({
        name: name.trim(),
        description: description.trim(),
        templateIds,
      });
      toast.success("Pack created");
      setOpen(false);
      reset();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create pack");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        New pack
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>New pack</DialogTitle>
            <DialogDescription>Bundle templates that can be generated together.</DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[70vh] gap-3 overflow-y-auto py-1">
            <div className="space-y-1.5">
              <Label htmlFor="new-pack-name">Name</Label>
              <Input id="new-pack-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-pack-description">Description</Label>
              <Textarea
                id="new-pack-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <p className="text-[12px] text-muted-foreground">Templates</p>
              <ul className="space-y-2 text-sm">
                {templates.map((template) => (
                  <li key={template.id}>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={templateIds.includes(template.id)}
                        onChange={() => toggle(template.id)}
                        className="size-4 accent-primary"
                      />
                      <span>{template.name}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busy || !name.trim() || templateIds.length === 0}
              onClick={() => void save()}
            >
              {busy ? "Creating…" : "Create pack"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
