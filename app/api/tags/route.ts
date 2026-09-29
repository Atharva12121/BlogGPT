import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/api";
import { tagSchema } from "@/lib/validation/tag";
import { jsonError, jsonSuccess } from "@/lib/utils/api-response";
import { slugify } from "@/lib/utils/slug";

export async function GET() {
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { blogs: true } } },
  });
  return jsonSuccess(tags);
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth(["ADMIN"]);
  if (error) return error;

  const body = await request.json();
  const parsed = tagSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid tag", 400);

  const name = parsed.data.name.trim().toLowerCase();
  const slug = slugify(name);
  try {
    const tag = await prisma.tag.create({ data: { name, slug } });
    return jsonSuccess(tag, 201);
  } catch {
    return jsonError("Tag already exists", 409);
  }
}
