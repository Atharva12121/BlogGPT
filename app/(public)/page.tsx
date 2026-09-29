import { prisma } from "@/lib/db/prisma";
import { blogInclude } from "@/lib/services/blog";
import { HeroSection } from "@/components/public/hero-section";
import { BlogCard } from "@/components/public/blog-card";
import Link from "next/link";

export default async function HomePage() {
  const [featured, latest, categories] = await Promise.all([
    prisma.blog.findMany({
      where: { status: "PUBLISHED" },
      include: blogInclude,
      orderBy: { views: "desc" },
      take: 3,
    }),
    prisma.blog.findMany({
      where: { status: "PUBLISHED" },
      include: blogInclude,
      orderBy: { publishedAt: "desc" },
      take: 6,
    }),
    prisma.category.findMany({
      include: { _count: { select: { blogs: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <>
      <HeroSection />
      <div className="mx-auto max-w-7xl space-y-16 px-4 py-14 sm:px-6">
        <section>
          <div className="mb-6 flex items-end justify-between">
            <h2 className="font-serif text-3xl font-semibold">Featured</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {featured.map((blog) => (
              <BlogCard key={blog.id} blog={blog} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-6 font-serif text-3xl font-semibold">Latest</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {latest.map((blog) => (
              <BlogCard key={blog.id} blog={blog} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-6 font-serif text-3xl font-semibold">Categories</h2>
          <div className="flex flex-wrap gap-3">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/search?category=${cat.slug}`}
                className="rounded-full border px-4 py-2 text-sm hover:border-accent hover:text-accent"
              >
                {cat.name} ({cat._count.blogs})
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
