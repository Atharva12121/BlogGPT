"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { BlogTable, type BlogRow } from "@/components/employee/blog-table";
import { Button } from "@/components/ui/button";

export function AdminBlogsList() {
  const [blogs, setBlogs] = useState<BlogRow[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const loadBlogs = async () => {
    setIsSearching(true);
    try {
      const params = new URLSearchParams({ all: "true", limit: "200" });
      if (searchTerm) params.set("q", searchTerm);
      const response = await fetch(`/api/blogs?${params.toString()}`, {
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        toast.error(result.message || "Unable to load blogs.");
        return;
      }
      setBlogs(result.data.items);
    } catch (error) {
      if (!controller.signal.aborted) {
        toast.error(error instanceof Error ? error.message : "Unable to reach the server.");
      }
    } finally {
      if (!controller.signal.aborted) setIsSearching(false);
    }
    };
    void loadBlogs();
    return () => controller.abort();
  }, [searchTerm]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchTerm(searchInput.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">All blogs</h1>
          <p className="text-muted-foreground">Review and manage every employee’s posts.</p>
        </div>
        <Link href="/dashboard/admin/blogs/new">
          <Button variant="accent"><Plus className="h-4 w-4" aria-hidden />Create blog</Button>
        </Link>
      </div>
      <BlogTable
        blogs={blogs}
        isAdmin
        searchQuery={searchInput}
        onSearchChange={setSearchInput}
        isLoading={isSearching}
      />
    </div>
  );
}
