import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/api";
import { blogUpdateSchema } from "@/lib/validation/blog";
import { jsonError, jsonSuccess } from "@/lib/utils/api-response";
import { canDeleteBlog, canEditBlog } from "@/lib/permissions";
import {
  blogInclude,
  blogReadingTime,
  buildPublishedAt,
  normalizeTags,
  prepareBlogContent,
  resolveSlug,
  syncBlogTags,
} from "@/lib/services/blog";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const blog = await prisma.blog.findUnique({
    where: { id },
    include: blogInclude,
  });
  if (!blog) return jsonError("Blog not found", 404);

  const { session } = await requireAuth();
  if (blog.status !== "PUBLISHED") {
    if (!session) return jsonError("Unauthorized", 401);
    if (!canEditBlog(session, blog.authorId, blog.status)) {
      return jsonError("Forbidden", 403);
    }
  }

  return jsonSuccess(blog);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(["ADMIN", "EMPLOYEE"]);
  if (error) return error;
  const { id } = await params;

  const existing = await prisma.blog.findUnique({ where: { id } });
  if (!existing) return jsonError("Blog not found", 404);
  if (!canEditBlog(session!, existing.authorId, existing.status)) {
    return jsonError("Forbidden", 403);
  }

  try {
    const body = await request.json();
    const parsed = blogUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Invalid blog data", 400, parsed.error.flatten());
    }

    const data = parsed.data;
    const content = data.content ? prepareBlogContent(data.content) : undefined;
    const status = data.status ?? existing.status;
    const slug =
      data.title || data.slug
        ? await resolveSlug(data.title || existing.title, data.slug || existing.slug, id)
        : undefined;

    let tagIds: string[] | undefined;
    if (data.tagIds || data.tagNames) {
      tagIds = await normalizeTags(data.tagIds, data.tagNames);
    }

    const updated = await prisma.blog.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(slug && { slug }),
        ...(content && { content }),
        ...(data.excerpt !== undefined && { excerpt: data.excerpt }),
        ...(data.coverImage !== undefined && { coverImage: data.coverImage }),
        ...(data.coverImagePublicId !== undefined && {
          coverImagePublicId: data.coverImagePublicId,
        }),
        ...(data.localImagePath !== undefined && {
          localImagePath: data.localImagePath,
        }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        status,
        readingTimeMinutes: content
          ? blogReadingTime(content)
          : existing.readingTimeMinutes,
        publishedAt: buildPublishedAt(status, existing.publishedAt),
      },
      include: blogInclude,
    });

    if (tagIds) await syncBlogTags(id, tagIds);

    return jsonSuccess(updated);
  } catch (e) {
    console.error(e);
    return jsonError("Unable to update blog", 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(["ADMIN", "EMPLOYEE"]);
  if (error) return error;
  const { id } = await params;

  const existing = await prisma.blog.findUnique({ where: { id } });
  if (!existing) return jsonError("Blog not found", 404);

  if (session!.role !== "ADMIN" && existing.status !== "DRAFT") {
    return jsonError("Only drafts can be deleted by employees", 403);
  }
  if (!canDeleteBlog(session!, existing.authorId, existing.status)) {
    return jsonError("Forbidden", 403);
  }

  await prisma.blog.delete({ where: { id } });
  return jsonSuccess({ deleted: true });
}
