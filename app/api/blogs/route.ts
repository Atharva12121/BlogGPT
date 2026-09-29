import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/api";
import { blogCreateSchema } from "@/lib/validation/blog";
import { jsonError, jsonSuccess } from "@/lib/utils/api-response";
import {
  blogInclude,
  blogReadingTime,
  buildPublishedAt,
  normalizeTags,
  prepareBlogContent,
  resolveSlug,
  syncBlogTags,
} from "@/lib/services/blog";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim();
  const category = searchParams.get("category");
  const tag = searchParams.get("tag");
  const status = searchParams.get("status");
  const authorId = searchParams.get("authorId");
  const includeAll = searchParams.get("all") === "true";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(200, parseInt(searchParams.get("limit") || "12", 10));
  const skip = (page - 1) * limit;

  const validStatuses = ["DRAFT", "PUBLISHED", "UNPUBLISHED"] as const;
  if (status && !validStatuses.includes(status as (typeof validStatuses)[number])) {
    return jsonError("Invalid blog status", 400);
  }

  const where: Prisma.BlogWhereInput = {};
  const sessionRes = await requireAuth();
  const session = sessionRes.session;
  const requestsPrivateContent =
    includeAll || (!!status && status !== "PUBLISHED");

  if (requestsPrivateContent && !session) {
    return jsonError("Unauthorized", 401);
  }
  if (requestsPrivateContent && session?.role !== "ADMIN") {
    if (authorId && authorId !== session?.sub) {
      return jsonError("Forbidden", 403);
    }
    where.authorId = session!.sub;
  } else if (authorId) {
    where.authorId = authorId;
  }

  if (status) {
    where.status = status as Prisma.EnumBlogStatusFilter["equals"];
  } else if (!requestsPrivateContent) {
    where.status = "PUBLISHED";
  }

  if (category) where.category = { slug: category };
  if (tag) where.tags = { some: { tag: { slug: tag } } };
  if (q) {
    const searchableFields: Prisma.BlogWhereInput[] = [
      { title: { contains: q, mode: "insensitive" } },
      { content: { contains: q, mode: "insensitive" } },
      { excerpt: { contains: q, mode: "insensitive" } },
      { author: { is: { name: { contains: q, mode: "insensitive" } } } },
      { category: { is: { name: { contains: q, mode: "insensitive" } } } },
      { tags: { some: { tag: { is: { name: { contains: q, mode: "insensitive" } } } } } },
    ];
    if (/^[a-f\d]{24}$/i.test(q)) searchableFields.push({ authorId: q });
    where.OR = searchableFields;
  }

  const [items, total] = await Promise.all([
    prisma.blog.findMany({
      where,
      include: blogInclude,
      orderBy: { publishedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.blog.count({ where }),
  ]);

  return jsonSuccess({ items, total, page, limit });
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth(["ADMIN", "EMPLOYEE"]);
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = blogCreateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Invalid blog data", 400, parsed.error.flatten());
    }

    const data = parsed.data;
    const status = data.status || "DRAFT";
    const content = prepareBlogContent(data.content);
    const slug = await resolveSlug(data.title, data.slug);
    const tagIds = await normalizeTags(data.tagIds, data.tagNames);

    const blog = await prisma.blog.create({
      data: {
        title: data.title,
        slug,
        content,
        excerpt: data.excerpt,
        coverImage: data.coverImage ?? undefined,
        coverImagePublicId: data.coverImagePublicId ?? undefined,
        localImagePath: data.localImagePath ?? undefined,
        status,
        authorId: session!.sub,
        categoryId: data.categoryId ?? undefined,
        readingTimeMinutes: blogReadingTime(content),
        publishedAt: buildPublishedAt(status),
      },
      include: blogInclude,
    });

    await syncBlogTags(blog.id, tagIds);
    const full = await prisma.blog.findUnique({
      where: { id: blog.id },
      include: blogInclude,
    });

    return jsonSuccess(full, 201);
  } catch (e) {
    console.error(e);
    return jsonError("Unable to create blog", 500);
  }
}
