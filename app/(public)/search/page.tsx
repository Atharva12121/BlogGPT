import { prisma } from "@/lib/db/prisma";
import { blogInclude } from "@/lib/services/blog";
import { BlogCard } from "@/components/public/blog-card";
import { SearchFilters } from "@/components/public/search-filters";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Props = {
  searchParams: Promise<{ q?: string; category?: string; tag?: string; page?: string }>;
};

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q?.trim();
  const category = params.category;
  const tag = params.tag;
  const parsedPage = Number.parseInt(params.page || "1", 10);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const pageSize = 12;
  const where = {
    status: "PUBLISHED" as const,
    ...(category ? { category: { slug: category } } : {}),
    ...(tag ? { tags: { some: { tag: { slug: tag } } } } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { content: { contains: q, mode: "insensitive" as const } },
            { excerpt: { contains: q, mode: "insensitive" as const } },
            { author: { is: { name: { contains: q, mode: "insensitive" as const } } } },
            { category: { is: { name: { contains: q, mode: "insensitive" as const } } } },
            { tags: { some: { tag: { is: { name: { contains: q, mode: "insensitive" as const } } } } } },
          ],
        }
      : {}),
  };

  const [blogs, total, categories, tags] = await Promise.all([
    prisma.blog.findMany({
      where,
      include: blogInclude,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.blog.count({ where }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const visiblePages = totalPages <= 7
    ? Array.from({ length: totalPages }, (_, index) => index + 1)
    : [...new Set([1, page - 1, page, page + 1, totalPages])]
        .filter((pageNumber) => pageNumber >= 1 && pageNumber <= totalPages)
        .sort((a, b) => a - b);
  const pageHref = (targetPage: number) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (category) query.set("category", category);
    if (tag) query.set("tag", tag);
    query.set("page", String(targetPage));
    return `/search?${query.toString()}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-serif text-4xl font-semibold">Search & Filter</h1>
      <SearchFilters categories={categories} tags={tags} initial={params} />
      <p className="mt-5 text-sm text-muted-foreground">
        {total.toLocaleString()} {total === 1 ? "article" : "articles"} found
      </p>

      {blogs.length === 0 ? (
        <div className="mt-12 rounded-xl border border-dashed p-10 text-center">
          <p className="text-lg font-medium">No blogs found.</p>
          <p className="mt-2 text-muted-foreground">
            Try another keyword or category.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {blogs.map((blog) => (
            <BlogCard key={blog.id} blog={blog} query={q} />
          ))}
        </div>
      )}
      {totalPages > 1 && (
        <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Search result pages">
          {page > 1 ? (
            <Link href={pageHref(page - 1)}><Button variant="outline">Previous</Button></Link>
          ) : (
            <Button variant="outline" disabled>Previous</Button>
          )}
          {visiblePages.map((pageNumber, index) => (
            <span key={pageNumber} className="contents">
              {index > 0 && pageNumber - visiblePages[index - 1] > 1 && (
                <span className="px-1 text-muted-foreground" aria-hidden>…</span>
              )}
              <Link
                href={pageHref(pageNumber)}
                aria-current={pageNumber === page ? "page" : undefined}
                aria-label={`Page ${pageNumber}`}
                className={`inline-flex h-10 min-w-10 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors ${
                  pageNumber === page
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-input bg-background hover:bg-secondary"
                }`}
              >
                {pageNumber}
              </Link>
            </span>
          ))}
          {page < totalPages ? (
            <Link href={pageHref(page + 1)}><Button variant="outline">Next</Button></Link>
          ) : (
            <Button variant="outline" disabled>Next</Button>
          )}
        </nav>
      )}
    </div>
  );
}
