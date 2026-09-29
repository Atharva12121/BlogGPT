import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HighlightedText } from "@/components/ui/highlighted-text";

type BlogCardProps = {
  blog: {
    slug: string;
    title: string;
    excerpt?: string | null;
    content?: string;
    coverImage?: string | null;
    readingTimeMinutes: number;
    publishedAt?: Date | string | null;
    author: { name: string };
    category?: { name: string; slug: string } | null;
    tags?: { tag: { name: string; slug: string } }[];
  };
  query?: string;
};

export function BlogCard({ blog, query }: BlogCardProps & { query?: string }) {
  const image = blog.coverImage || "/images/blog-placeholder.svg";
  const isExternal = image.startsWith("http");
  const contentText = blog.content?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ?? "";
  const searchTerms = query?.trim().split(/\s+/).filter(Boolean) ?? [];
  const contentMatch = searchTerms.length
    ? contentText.toLowerCase().indexOf(searchTerms[0].toLowerCase())
    : -1;
  const contentSnippet = contentMatch >= 0
    ? `${contentMatch > 48 ? "…" : ""}${contentText.slice(Math.max(0, contentMatch - 48), contentMatch + 180)}${contentMatch + 180 < contentText.length ? "…" : ""}`
    : "";
  const excerpt = query && blog.excerpt && !blog.excerpt.toLowerCase().includes(searchTerms[0]?.toLowerCase() ?? "")
    ? contentSnippet || blog.excerpt
    : blog.excerpt || contentSnippet;

  return (
    <Card className="blog-card group overflow-hidden transition hover:-translate-y-1 hover:shadow-md">
      <Link href={`/blog/${blog.slug}`} className="block">
        <div className="relative aspect-[16/9] overflow-hidden bg-secondary">
          {isExternal ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
          ) : (
            <Image
              src={image}
              alt=""
              fill
              className="object-cover transition group-hover:scale-105"
              sizes="(max-width:768px) 100vw, 33vw"
            />
          )}
        </div>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {blog.category && <Badge variant="accent"><HighlightedText text={blog.category.name} query={query} /></Badge>}
          </div>
          <CardTitle className="font-serif text-xl leading-snug group-hover:text-accent">
            <HighlightedText text={blog.title} query={query} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {excerpt && <HighlightedText text={excerpt} query={query} />}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span><HighlightedText text={blog.author.name} query={query} /></span>
            {blog.publishedAt && (
              <span>{format(new Date(blog.publishedAt), "MMM d, yyyy")}</span>
            )}
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {blog.readingTimeMinutes} min read
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {blog.tags?.slice(0, 3).map(({ tag }) => (
              <Badge key={tag.slug} variant="outline">
                <HighlightedText text={tag.name} query={query} />
              </Badge>
            ))}
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
