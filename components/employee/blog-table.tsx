"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HighlightedText } from "@/components/ui/highlighted-text";
import { LoaderCircle, Search } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export type BlogRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  views: number;
  createdAt: string;
  updatedAt: string;
  category?: { name: string } | null;
  author?: { id: string; name: string; email: string };
};

export function BlogTable({
  blogs,
  isAdmin,
  searchQuery = "",
  onSearchChange,
  isLoading = false,
}: {
  blogs: BlogRow[];
  isAdmin?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  isLoading?: boolean;
}) {
  const router = useRouter();
  const [blogToDelete, setBlogToDelete] = useState<BlogRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ id: string; type: "publish" | "unpublish" } | null>(null);

  const action = async (id: string, type: "publish" | "unpublish" | "delete") => {
    if (type === "delete") {
      setBlogToDelete(blogs.find((blog) => blog.id === id) ?? null);
      return;
    }
    const url = `/api/blogs/${id}/${type}`;
    setPendingAction({ id, type });
    try {
      const res = await fetch(url, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.message || "Action failed.");
        return;
      }
      toast.success("Updated successfully.");
      router.refresh();
      window.location.reload();
    } catch {
      toast.error("Unable to reach the server.");
    } finally {
      setPendingAction(null);
    }
  };

  const deleteBlog = async () => {
    if (!blogToDelete) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/blogs/${blogToDelete.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok || !result.success) {
        toast.error(result.message || "Unable to delete blog.");
        return;
      }
      toast.success("Blog deleted.");
      setBlogToDelete(null);
      router.refresh();
    } catch {
      toast.error("Unable to reach the server.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {onSearchChange && (
        <label className="relative block max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.currentTarget.value)}
            className="pl-9"
            placeholder="Search title, content, author, category, or tag"
            aria-label="Search blogs"
          />
        </label>
      )}
      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
        <thead className="bg-secondary/60 text-left">
          <tr>
            <th className="px-4 py-3">Title</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Views</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {blogs.map((blog) => (
            <tr key={blog.id} className="border-t">
              <td className="px-4 py-3 font-medium">
                <p><HighlightedText text={blog.title} query={searchQuery} /></p>
                {blog.author && (
                  <div className="mt-1 space-y-0.5 text-xs font-normal text-muted-foreground">
                    <p>
                      <HighlightedText text={blog.author.name} query={searchQuery} />
                      {isAdmin && <> · <HighlightedText text={blog.author.email} query={searchQuery} /></>}
                    </p>
                    {isAdmin && (
                      <p className="break-all font-mono">
                        Author ID: <HighlightedText text={blog.author.id} query={searchQuery} />
                      </p>
                    )}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline">{blog.status}</Badge>
              </td>
              <td className="px-4 py-3">
                {blog.category?.name
                  ? <HighlightedText text={blog.category.name} query={searchQuery} />
                  : "—"}
              </td>
              <td className="px-4 py-3">{blog.views}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <Link href={isAdmin ? `/dashboard/admin/blogs/${blog.id}` : `/dashboard/employee/blogs/${blog.id}/edit`}>
                    <Button size="sm" variant="outline">
                      Edit
                    </Button>
                  </Link>
                  {blog.status === "PUBLISHED" && (
                    <Link href={`/blog/${blog.slug}`} target="_blank">
                      <Button size="sm" variant="ghost">
                        View
                      </Button>
                    </Link>
                  )}
                  {blog.status === "DRAFT" && (
                    <>
                      <Button size="sm" variant="secondary" disabled={pendingAction?.id === blog.id} onClick={() => action(blog.id, "publish")}>
                        {pendingAction?.id === blog.id ? <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" /> : null}{pendingAction?.id === blog.id ? "Publishing…" : "Publish"}
                      </Button>
                      {!isAdmin && (
                        <Button size="sm" variant="destructive" disabled={deleting} onClick={() => action(blog.id, "delete")}>
                          Delete
                        </Button>
                      )}
                    </>
                  )}
                  {(isAdmin || blog.status === "UNPUBLISHED") && blog.status === "UNPUBLISHED" && (
                    <Button size="sm" variant="secondary" disabled={pendingAction?.id === blog.id} onClick={() => action(blog.id, "publish")}>
                      {pendingAction?.id === blog.id ? <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" /> : null}{pendingAction?.id === blog.id ? "Publishing…" : "Publish"}
                    </Button>
                  )}
                  {!isAdmin && blog.status === "PUBLISHED" && (
                      <Button size="sm" variant="secondary" disabled={pendingAction?.id === blog.id} onClick={() => action(blog.id, "unpublish")}>
                        {pendingAction?.id === blog.id ? <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" /> : null}{pendingAction?.id === blog.id ? "Updating…" : "Unpublish"}
                    </Button>
                  )}
                  {isAdmin && (
                    <>
                      {blog.status === "PUBLISHED" && (
                        <Button size="sm" variant="secondary" disabled={pendingAction?.id === blog.id} onClick={() => action(blog.id, "unpublish")}>
                          {pendingAction?.id === blog.id ? <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" /> : null}{pendingAction?.id === blog.id ? "Updating…" : "Unpublish"}
                        </Button>
                      )}
                      <Button size="sm" variant="destructive" disabled={deleting} onClick={() => action(blog.id, "delete")}>
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {blogs.length === 0 && (
            <tr>
              <td className="px-4 py-8 text-center text-muted-foreground" colSpan={5}>
                {isLoading ? "Searching blogs…" : searchQuery ? "No blogs match your search." : "No blogs yet."}
                {!isLoading && !searchQuery && !isAdmin && (
                  <Link href="/dashboard/employee/blogs/new" className="ml-2 inline-block">
                    <Button size="sm">Create Blog</Button>
                  </Link>
                )}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
      <ConfirmDialog
        open={Boolean(blogToDelete)}
        onOpenChange={(open) => !open && !deleting && setBlogToDelete(null)}
        title="Delete this blog?"
        description={`“${blogToDelete?.title ?? "This blog"}” will be permanently deleted. This action cannot be undone.`}
        confirmLabel="Delete blog"
        loading={deleting}
        onConfirm={() => void deleteBlog()}
      />
    </div>
  );
}
