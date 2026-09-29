"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BlogTable, type BlogRow } from "@/components/employee/blog-table";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function EmployeeBlogsPage() {
  const { user } = useAuth();
  const [blogs, setBlogs] = useState<BlogRow[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    setIsSearching(true);
    const params = new URLSearchParams({
      all: "true",
      authorId: user.id,
      limit: "200",
    });
    if (searchTerm) params.set("q", searchTerm);
    fetch(`/api/blogs?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load your blogs.");
        }
        setBlogs(result.data.items);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        toast.error(error instanceof Error ? error.message : "Unable to load your blogs.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsSearching(false);
      });
    return () => controller.abort();
  }, [user, searchTerm]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchTerm(searchInput.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">My Blogs</h1>
        <Link href="/dashboard/employee/blogs/new">
          <Button variant="accent">New Blog</Button>
        </Link>
      </div>
      <BlogTable
        blogs={blogs}
        searchQuery={searchInput}
        onSearchChange={setSearchInput}
        isLoading={isSearching}
      />
    </div>
  );
}
