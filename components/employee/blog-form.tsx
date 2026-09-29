"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { AiAssistantPanel } from "@/components/ai/ai-assistant-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/utils/slug";
import { MAX_IMAGE_SIZE_BYTES, MAX_IMAGE_SIZE_LABEL } from "@/lib/storage/constants";

type Category = { id: string; name: string };
type Tag = { id: string; name: string };

type BlogFormProps = {
  mode: "create" | "edit";
  blogId?: string;
  afterSavePath?: string;
  initial?: {
    title: string;
    slug: string;
    excerpt?: string;
    content: string;
    categoryId?: string | null;
    tagIds?: string[];
    coverImage?: string | null;
    coverImagePublicId?: string | null;
    localImagePath?: string | null;
    status?: string;
    tagNames?: string[];
  };
};

export function BlogForm({
  mode,
  blogId,
  afterSavePath = "/dashboard/employee/blogs",
  initial,
}: BlogFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title || "");
  const [slug, setSlug] = useState(initial?.slug || "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt || "");
  const [content, setContent] = useState(initial?.content || "<p></p>");
  const [categoryId, setCategoryId] = useState(initial?.categoryId || "");
  const [tagInput, setTagInput] = useState(initial?.tagNames?.join(", ") || "");
  const [categories, setCategories] = useState<Category[]>([]);
  const [coverImage, setCoverImage] = useState(initial?.coverImage || "");
  const [coverImagePublicId, setCoverImagePublicId] = useState(
    initial?.coverImagePublicId || ""
  );
  const [localImagePath, setLocalImagePath] = useState(initial?.localImagePath || "");
  const [saving, setSaving] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "unsaved" | "saving" | "saved" | "error">("idle");
  const savingRef = useRef(false);
  const draftIdRef = useRef(mode === "edit" ? blogId ?? null : null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosavePromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let active = true;
    const loadCategories = async () => {
      try {
        const response = await fetch("/api/categories");
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error("The server returned an unexpected response while loading categories.");
        }

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load categories.");
        }
        if (active) setCategories(result.data);
      } catch (error) {
        if (!active) return;
        const message =
          error instanceof Error ? error.message : "Unable to load categories.";
        toast.error(message);
      }
    };

    void loadCategories();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (mode === "create" && title && !initial?.slug) {
      setSlug(slugify(title));
    }
  }, [title, mode, initial?.slug]);

  const tagNames = useMemo(
    () =>
      tagInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    [tagInput]
  );

  const payload = useMemo(
    () => ({
      title,
      slug,
      excerpt,
      content,
      categoryId: categoryId || null,
      tagNames,
      coverImage: coverImage || null,
      coverImagePublicId: coverImagePublicId || null,
      localImagePath: localImagePath || null,
    }),
    [title, slug, excerpt, content, categoryId, tagNames, coverImage, coverImagePublicId, localImagePath]
  );
  const payloadSnapshot = JSON.stringify(payload);
  const initialSnapshotRef = useRef(
    JSON.stringify({
      title: initial?.title || "",
      slug: initial?.slug || "",
      excerpt: initial?.excerpt || "",
      content: initial?.content || "<p></p>",
      categoryId: initial?.categoryId || null,
      tagNames: initial?.tagNames || [],
      coverImage: initial?.coverImage || null,
      coverImagePublicId: initial?.coverImagePublicId || null,
      localImagePath: initial?.localImagePath || null,
    })
  );
  const lastSavedSnapshotRef = useRef(initialSnapshotRef.current);

  const saveDraftInBackground = useCallback(async (snapshot: string, data: typeof payload) => {
    if (autosavePromiseRef.current) await autosavePromiseRef.current;
    if (savingRef.current || snapshot === lastSavedSnapshotRef.current) return;
    savingRef.current = true;
    setAutosaveStatus("saving");
    const operation = (async () => {
      try {
        const existingId = draftIdRef.current;
        const response = await fetch(existingId ? `/api/blogs/${existingId}` : "/api/blogs", {
          method: existingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, status: "DRAFT" }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          setAutosaveStatus("error");
          return;
        }
        if (!existingId && result.data?.id) draftIdRef.current = result.data.id;
        lastSavedSnapshotRef.current = snapshot;
        setAutosaveStatus("saved");
      } catch {
        setAutosaveStatus("error");
      }
    })();
    autosavePromiseRef.current = operation;
    try {
      await operation;
    } finally {
      if (autosavePromiseRef.current === operation) autosavePromiseRef.current = null;
      savingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (payloadSnapshot === lastSavedSnapshotRef.current) return;
    setAutosaveStatus("unsaved");
    if (mode === "edit" && initial?.status !== "DRAFT") return;
    const hasContent = !!content.replace(/<[^>]*>/g, "").trim() || /<img\b/i.test(content);
    if (!title.trim() || !hasContent) return;

    autosaveTimerRef.current = setTimeout(() => {
      void saveDraftInBackground(payloadSnapshot, payload);
    }, 1800);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [payload, payloadSnapshot, title, content, mode, initial?.status, saveDraftInBackground]);

  const save = async (status: "DRAFT" | "PUBLISHED") => {
    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required.");
      return;
    }
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    savingRef.current = true;
    setSaving(true);
    try {
      if (autosavePromiseRef.current) await autosavePromiseRef.current;
      const currentId = draftIdRef.current;
      const url = currentId ? `/api/blogs/${currentId}` : "/api/blogs";
      const method = currentId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, status }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.message || "Unable to save blog.");
        return;
      }

      if (!currentId && json.data?.id) {
        draftIdRef.current = json.data.id;
      }
      lastSavedSnapshotRef.current = payloadSnapshot;
      setAutosaveStatus("saved");
      toast.success(status === "DRAFT" ? "Blog saved as draft." : "Blog published successfully.");
      router.push(afterSavePath);
      router.refresh();
    } catch {
      toast.error("Unable to reach the server.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const uploadCover = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    setSaving(true);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.message || "Invalid image format.");
        return;
      }
      setCoverImage(json.data.url);
      setCoverImagePublicId(json.data.coverImagePublicId || "");
      setLocalImagePath(json.data.localImagePath || "");
      toast.success("Cover image uploaded.");
    } catch {
      toast.error("Unable to upload the cover image.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <p aria-live="polite" className="text-xs text-muted-foreground">
          {autosaveStatus === "saving" && "Saving draft…"}
          {autosaveStatus === "saved" && "All changes saved"}
          {autosaveStatus === "unsaved" && mode === "edit" && initial?.status !== "DRAFT"
            ? "Unsaved changes · Save manually to update this post"
            : autosaveStatus === "unsaved" && "Unsaved changes"}
          {autosaveStatus === "error" && "Auto-save failed. Use Save Draft to retry."}
        </p>
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="excerpt">Excerpt</Label>
          <Textarea id="excerpt" rows={3} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
        </div>
        <RichTextEditor content={content} onChange={setContent} />
      </div>

      <div className="space-y-4">
        <AiAssistantPanel
          text={content}
          title={title}
          topic={title}
          onApply={(value) => setContent(value.startsWith("<") ? value : `<p>${value}</p>`)}
        />

        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div>
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input id="tags" value={tagInput} onChange={(e) => setTagInput(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="cover">Cover image <span className="text-muted-foreground">(max 5 MB)</span></Label>
            <Input
              id="cover"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && f.size > MAX_IMAGE_SIZE_BYTES) {
                  toast.error(`Image must be ${MAX_IMAGE_SIZE_LABEL} or smaller.`);
                  e.currentTarget.value = "";
                  return;
                }
                if (f) uploadCover(f);
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="button" variant="secondary" disabled={saving} onClick={() => save("DRAFT")}>
              Save Draft
            </Button>
            <Button type="button" variant="outline" disabled={saving} onClick={() => window.open(`/blog/${slug}`, "_blank")}>
              Preview
            </Button>
            <Button type="button" variant="accent" disabled={saving} onClick={() => save("PUBLISHED")}>
              Publish
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
