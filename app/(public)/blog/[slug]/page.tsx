import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { format } from "date-fns";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { blogInclude } from "@/lib/services/blog";
import { BlogContent } from "@/components/blog/blog-content";
import { ViewerAiPanel } from "@/components/ai/viewer-ai-panel";
import { Badge } from "@/components/ui/badge";
import { BlogCard } from "@/components/public/blog-card";
import { ViewTracker } from "@/components/public/view-tracker";
import { BlogEngagement } from "@/components/public/blog-engagement";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const blog = await prisma.blog.findUnique({ where: { slug } });
  if (!blog || blog.status !== "PUBLISHED") return { title: "Blog not found" };
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return {
    title: blog.title,
    description: blog.excerpt || undefined,
    openGraph: {
      title: blog.title,
      description: blog.excerpt || undefined,
      images: blog.coverImage ? [blog.coverImage] : undefined,
      url: `${base}/blog/${blog.slug}`,
    },
  };
}

export default async function BlogDetailPage({ params }: Props) {
  const { slug } = await params;
  const blog = await prisma.blog.findUnique({
    where: { slug },
    include: {
      ...blogInclude,
      author: { select: { id: true, name: true, avatar: true } },
    },
  });

  if (!blog || blog.status !== "PUBLISHED") notFound();

  const related = await prisma.blog.findMany({
    where: {
      status: "PUBLISHED",
      categoryId: blog.categoryId || undefined,
      NOT: { id: blog.id },
    },
    include: blogInclude,
    take: 3,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <ViewTracker slug={slug} />
      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <article>
          <header className="mx-auto max-w-3xl">
            {blog.category && (
              <Badge variant="accent" className="mb-4">
                {blog.category.name}
              </Badge>
            )}
            <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
              {blog.title}
            </h1>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span>{blog.author.name}</span>
              {blog.publishedAt && (
                <time dateTime={blog.publishedAt.toISOString()}>
                  {format(blog.publishedAt, "MMMM d, yyyy")}
                </time>
              )}
              <span>{blog.readingTimeMinutes} min read</span>
              <span>{blog.views} views</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {blog.tags.map(({ tag }) => (
                <Link key={tag.id} href={`/search?tag=${tag.slug}`}>
                  <Badge variant="outline">#{tag.name}</Badge>
                </Link>
              ))}
            </div>
          </header>

          {blog.coverImage && (
            <div className="mx-auto mt-8 max-w-4xl overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={blog.coverImage} alt="" className="w-full object-cover" />
            </div>
          )}

          <div className="mt-10">
            <BlogContent html={blog.content} />
          </div>

          <div className="mx-auto mt-8 flex max-w-3xl flex-wrap gap-3">
            <a href={`/api/blogs/slug/${blog.slug}/pdf`} download>
              <Button variant="outline">Download as PDF</Button>
            </a>
          </div>

          <div className="mx-auto mt-10 max-w-3xl">
            <p className="text-sm text-muted-foreground">
              Share:{" "}
              <a
                className="text-accent underline-offset-4 hover:underline"
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(blog.title)}`}
                target="_blank"
                rel="noreferrer"
              >
                Twitter
              </a>
            </p>
          </div>
          <BlogEngagement blogId={blog.id} blogSlug={blog.slug} />
        </article>

        <ViewerAiPanel blogId={blog.id} />
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 font-serif text-2xl font-semibold">Related posts</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {related.map((b) => (
              <BlogCard key={b.id} blog={b} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
