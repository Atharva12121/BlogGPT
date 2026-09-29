"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Item = {
  id: string;
  name: string;
  slug: string;
  _count?: { blogs: number };
};

export function TaxonomyManager({
  kind,
  title,
}: {
  kind: "categories" | "tags";
  title: string;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState("");
  const [editingError, setEditingError] = useState("");
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/${kind}`);
      const result = await response.json();
      if (!response.ok || !result.success) {
        toast.error(result.message || `Unable to load ${title.toLowerCase()}.`);
        return;
      }
      setItems(result.data);
    } catch {
      toast.error("Unable to reach the server.");
    } finally {
      setLoading(false);
    }
  }, [kind, title]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 80) {
      setNameError("Enter a name between 2 and 80 characters.");
      return;
    }
    setNameError("");
    setSaving(true);
    try {
      const response = await fetch(`/api/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        toast.error(result.message || `Unable to add ${title.toLowerCase()}.`);
        return;
      }
      setName("");
      toast.success(`${title.slice(0, -1)} added.`);
      await load();
    } catch {
      toast.error("Unable to reach the server.");
    } finally {
      setSaving(false);
    }
  };

  const save = async (id: string) => {
    const trimmedName = editingName.trim();
    if (trimmedName.length < 2 || trimmedName.length > 80) {
      setEditingError("Enter a name between 2 and 80 characters.");
      return;
    }
    setEditingError("");
    setSaving(true);
    try {
      const response = await fetch(`/api/${kind}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        toast.error(result.message || `Unable to update ${title.toLowerCase()}.`);
        return;
      }
      setEditingId(null);
      toast.success(`${title.slice(0, -1)} updated.`);
      await load();
    } catch {
      toast.error("Unable to reach the server.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/${kind}/${itemToDelete.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok || !result.success) {
        toast.error(result.message || `Unable to delete ${title.toLowerCase()}.`);
        return;
      }
      toast.success(`${title.slice(0, -1)} deleted.`);
      setItemToDelete(null);
      await load();
    } catch {
      toast.error("Unable to reach the server.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="flex max-w-xl items-start gap-3" noValidate>
        <div className="flex-1">
          <Input value={name} onChange={(event) => { setName(event.target.value); setNameError(""); }} placeholder={`New ${title.slice(0, -1).toLowerCase()} name`} minLength={2} maxLength={80} required aria-label={`${title.slice(0, -1)} name`} aria-invalid={Boolean(nameError)} aria-describedby={nameError ? "taxonomy-name-error" : undefined} />
          {nameError && <p id="taxonomy-name-error" role="alert" className="mt-1 text-sm text-destructive">{nameError}</p>}
        </div>
        <Button type="submit" variant="accent" disabled={saving}>{saving && <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" />}{saving ? "Adding…" : "Add"}</Button>
      </form>
      <div className="overflow-hidden rounded-xl border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-secondary/60">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Slug</th><th className="px-4 py-3">Blogs</th><th className="px-4 py-3">Actions</th></tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="px-4 py-3">
                  {editingId === item.id ? (
                    <div><Input value={editingName} onChange={(event) => { setEditingName(event.target.value); setEditingError(""); }} aria-label={`Edit ${item.name}`} aria-invalid={Boolean(editingError)} aria-describedby={editingError ? "taxonomy-edit-error" : undefined} />{editingError && <p id="taxonomy-edit-error" role="alert" className="mt-1 text-sm text-destructive">{editingError}</p>}</div>
                  ) : item.name}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{item.slug}</td>
                <td className="px-4 py-3">{item._count?.blogs ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {editingId === item.id ? (
                      <>
                        <Button size="sm" variant="accent" disabled={saving} onClick={() => save(item.id)}>{saving && <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" />}{saving ? "Saving…" : "Save"}</Button>
                        <Button size="icon" variant="ghost" aria-label="Cancel edit" onClick={() => setEditingId(null)}><X className="h-4 w-4" aria-hidden /></Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => { setEditingId(item.id); setEditingName(item.name); }}><Pencil className="h-4 w-4" aria-hidden />Edit</Button>
                        <Button size="icon" variant="destructive" aria-label={`Delete ${item.name}`} onClick={() => setItemToDelete(item)}><Trash2 className="h-4 w-4" aria-hidden /></Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td className="px-4 py-8 text-center text-muted-foreground" colSpan={4}>{loading ? <span className="inline-flex items-center gap-2"><LoaderCircle aria-hidden className="h-4 w-4 animate-spin" />Loading {title.toLowerCase()}…</span> : `No ${title.toLowerCase()} yet.`}</td></tr>}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={Boolean(itemToDelete)}
        onOpenChange={(open) => !open && !deleting && setItemToDelete(null)}
        title={`Delete ${title.slice(0, -1).toLowerCase()}?`}
        description={`“${itemToDelete?.name ?? ""}” will be permanently removed.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={() => void remove()}
      />
    </div>
  );
}
