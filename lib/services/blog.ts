import { prisma } from "@/lib/db/prisma";
import { calculateReadingTime } from "@/lib/utils/reading-time";
import { slugify, uniqueBlogSlug } from "@/lib/utils/slug";
import { sanitizeHtml } from "@/lib/utils/sanitize";
import type { BlogStatus } from "@prisma/client";

export async function normalizeTags(tagIds?: string[], tagNames?: string[]) {
  const ids: string[] = [...(tagIds || [])];
  if (tagNames?.length) {
    for (const name of tagNames) {
      const normalized = name.trim().toLowerCase();
      if (!normalized) continue;
      const slug = slugify(normalized);
      const tag = await prisma.tag.upsert({
        where: { slug },
        create: { name: normalized, slug },
        update: {},
      });
      if (!ids.includes(tag.id)) ids.push(tag.id);
    }
  }
  return ids;
}

export async function syncBlogTags(blogId: string, tagIds: string[]) {
  await prisma.blogTag.deleteMany({ where: { blogId } });
  if (tagIds.length) {
    await prisma.blogTag.createMany({
      data: tagIds.map((tagId) => ({ blogId, tagId })),
    });
  }
}

export function prepareBlogContent(content: string) {
  return sanitizeHtml(content);
}

export async function resolveSlug(title: string, slug?: string, excludeId?: string) {
  const base = slug?.trim() || title;
  return uniqueBlogSlug(base, async (s) => {
    const existing = await prisma.blog.findUnique({ where: { slug: s } });
    return !!existing && existing.id !== excludeId;
  });
}

export function buildPublishedAt(status: BlogStatus, current?: Date | null) {
  if (status === "PUBLISHED") return current ?? new Date();
  return null;
}

export function blogReadingTime(content: string) {
  return calculateReadingTime(content);
}

export const blogInclude = {
  author: { select: { id: true, name: true, email: true, avatar: true } },
  category: true,
  tags: { include: { tag: true } },
  _count: { select: { likes: true, comments: true } },
};
