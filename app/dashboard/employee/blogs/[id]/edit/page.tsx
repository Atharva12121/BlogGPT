"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BlogForm } from "@/components/employee/blog-form";
import { toast } from "sonner";

export default function EditBlogPage() {
  const params = useParams<{ id: string }>();
  const [blog, setBlog] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/blogs/${params.id}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load blog.");
        }
        setBlog(result.data);
      })
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "Unable to load blog.");
      });
  }, [params.id]);

  if (!blog) return <div className="h-64 animate-pulse rounded-xl bg-secondary" />;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Edit Blog</h1>
      <BlogForm
        mode="edit"
        blogId={blog.id}
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
          tagNames: blog.tags.map(({ tag }: { tag: { name: string } }) => tag.name),
        }}
      />
    </div>
  );
}
