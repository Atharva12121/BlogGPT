import { BlogForm } from "@/components/employee/blog-form";

export default function AdminNewBlogPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Create blog</h1>
      <BlogForm mode="create" afterSavePath="/dashboard/admin/blogs" />
    </div>
  );
}
