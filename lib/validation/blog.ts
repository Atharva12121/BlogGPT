import { z } from "zod";

export const blogCreateSchema = z.object({
  title: z.string().min(3).max(200),
  slug: z.string().max(220).optional(),
  content: z.string().min(1),
  excerpt: z.string().max(500).optional(),
  coverImage: z.string().optional().nullable(),
  coverImagePublicId: z.string().optional().nullable(),
  localImagePath: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  tagIds: z.array(z.string()).optional(),
  tagNames: z.array(z.string()).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "UNPUBLISHED"]).optional(),
});

export const blogUpdateSchema = blogCreateSchema.partial();
