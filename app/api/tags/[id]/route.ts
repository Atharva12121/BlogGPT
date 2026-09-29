import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/api";
import { tagSchema } from "@/lib/validation/tag";
import { jsonError, jsonSuccess } from "@/lib/utils/api-response";
import { slugify } from "@/lib/utils/slug";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const { error } = await requireAuth(["ADMIN"]);
  if (error) return error;
  const { id } = await params;

  const body = await request.json();
  const parsed = tagSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid tag", 400);

  const name = parsed.data.name.trim().toLowerCase();
  const tag = await prisma.tag.update({
    where: { id },
    data: { name, slug: slugify(name) },
  });
  return jsonSuccess(tag);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error } = await requireAuth(["ADMIN"]);
  if (error) return error;
  const { id } = await params;

  await prisma.blogTag.deleteMany({ where: { tagId: id } });
  await prisma.tag.delete({ where: { id } });
  return jsonSuccess({ deleted: true });
}
