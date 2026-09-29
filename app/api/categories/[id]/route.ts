import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/api";
import { categorySchema } from "@/lib/validation/category";
import { jsonError, jsonSuccess } from "@/lib/utils/api-response";
import { slugify } from "@/lib/utils/slug";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const { error } = await requireAuth(["ADMIN"]);
  if (error) return error;
  const { id } = await params;

  const body = await request.json();
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid category", 400);

  const category = await prisma.category.update({
    where: { id },
    data: { name: parsed.data.name, slug: slugify(parsed.data.name) },
  });
  return jsonSuccess(category);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error } = await requireAuth(["ADMIN"]);
  if (error) return error;
  const { id } = await params;

  const count = await prisma.blog.count({ where: { categoryId: id } });
  if (count > 0) {
    return jsonError("Cannot delete category with assigned blogs", 400);
  }

  await prisma.category.delete({ where: { id } });
  return jsonSuccess({ deleted: true });
}
