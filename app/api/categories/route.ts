import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/api";
import { categorySchema } from "@/lib/validation/category";
import { jsonError, jsonSuccess } from "@/lib/utils/api-response";
import { slugify } from "@/lib/utils/slug";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { blogs: true } } },
    });
    return jsonSuccess(categories);
  } catch (error) {
    console.error("Unable to load categories", error);
    return jsonError("Unable to load categories.", 500);
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth(["ADMIN"]);
  if (error) return error;

  const body = await request.json();
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid category", 400);

  const slug = slugify(parsed.data.name);
  try {
    const category = await prisma.category.create({
      data: { name: parsed.data.name, slug },
    });
    return jsonSuccess(category, 201);
  } catch {
    return jsonError("Category already exists", 409);
  }
}
