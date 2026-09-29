"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  categories: { id: string; name: string; slug: string }[];
  tags: { id: string; name: string; slug: string }[];
  initial: { q?: string; category?: string; tag?: string };
};

export function SearchFilters({ categories, tags, initial }: Props) {
  const router = useRouter();
  const [q, setQ] = useState(initial.q || "");
  const [category, setCategory] = useState(initial.category || "");
  const [tag, setTag] = useState(initial.tag || "");

  const searchHref = useCallback(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (category) params.set("category", category);
    if (tag) params.set("tag", tag);
    return `/search${params.size ? `?${params.toString()}` : ""}`;
  }, [q, category, tag]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.replace(searchHref(), { scroll: false });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchHref, router]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    router.replace(searchHref(), { scroll: false });
  };

  return (
    <form onSubmit={submit} className="mt-6 grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-4">
      <Input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search title, content, author, category, or tag"
        aria-label="Search query"
      />
      <select
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        aria-label="Filter by category"
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        value={tag}
        onChange={(e) => setTag(e.target.value)}
        aria-label="Filter by tag"
      >
        <option value="">All tags</option>
        {tags.map((t) => (
          <option key={t.id} value={t.slug}>
            {t.name}
          </option>
        ))}
      </select>
      <Button type="submit" variant="accent">
        Search
      </Button>
    </form>
  );
}
