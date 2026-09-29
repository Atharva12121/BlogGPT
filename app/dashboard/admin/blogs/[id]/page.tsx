"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BlogForm } from "@/components/employee/blog-form";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Blog = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  categoryId: string | null;
  coverImage: string | null;
  coverImagePublicId: string | null;
  localImagePath: string | null;
  status: string;
  tags: { tag: { name: string } }[];
};

export default function AdminEditBlogPage() {
  const { id } = useParams<{ id: string }>();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/blogs/${id}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "Unable to load blog.");
        setBlog(result.data);
      })
      .catch((reason: unknown) => {
        setError(true);
        toast.error(reason instanceof Error ? reason.message : "Unable to load blog.");
      });
  }, [id]);

  if (error) {
    return (
      <div className="space-y-4">
        <p>Unable to load this blog.</p>
        <Link href="/dashboard/admin/blogs"><Button variant="outline">Back to blogs</Button></Link>
      </div>
    );
  }
  if (!blog) return <div className="h-64 animate-pulse rounded-xl bg-secondary" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Edit blog</h1>
        <p className="text-muted-foreground">Status: {blog.status}. Admin can edit any employee’s post.</p>
      </div>
      <BlogForm
        mode="edit"
        blogId={blog.id}
        afterSavePath="/dashboard/admin/blogs"
        initial={{
          title: blog.title,
          slug: blog.slug,
          excerpt: blog.excerpt || "",
          content: blog.content,
          categoryId: blog.categoryId,
          coverImage: blog.coverImage,
          coverImagePublicId: blog.coverImagePublicId,
          localImagePath: blog.localImagePath,
          status: blog.status,
          tagNames: blog.tags.map(({ tag }) => tag.name),
        }}
      />
    </div>
  );
}
