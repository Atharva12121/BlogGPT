import { BlogForm } from "@/components/employee/blog-form";

export default function NewBlogPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Create Blog</h1>
      <BlogForm mode="create" />
    </div>
  );
}
