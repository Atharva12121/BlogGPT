import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/api";
import { jsonError, jsonSuccess } from "@/lib/utils/api-response";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const blog = await prisma.blog.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!blog || blog.status !== "PUBLISHED") {
    return jsonError("Blog not found", 404);
  }

  const [{ session }, count] = await Promise.all([
    requireAuth(),
    prisma.like.count({ where: { blogId: id } }),
  ]);
  const liked =
    session?.role === "READER"
      ? Boolean(
          await prisma.like.findUnique({
            where: { blogId_userId: { blogId: id, userId: session.sub } },
            select: { id: true },
          })
        )
      : false;

  return jsonSuccess({ count, liked, canLike: session?.role === "READER" });
}

export async function POST(_request: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(["READER"]);
  if (error || !session) return error;
  const { id } = await params;

  const blog = await prisma.blog.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!blog || blog.status !== "PUBLISHED") {
    return jsonError("Blog not found", 404);
  }

  await prisma.like.upsert({
    where: { blogId_userId: { blogId: id, userId: session.sub } },
    create: { blogId: id, userId: session.sub },
    update: {},
  });
  const count = await prisma.like.count({ where: { blogId: id } });
  return jsonSuccess({ liked: true, count });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(["READER"]);
  if (error || !session) return error;
  const { id } = await params;

  const blog = await prisma.blog.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!blog || blog.status !== "PUBLISHED") {
    return jsonError("Blog not found", 404);
  }

  await prisma.like.deleteMany({ where: { blogId: id, userId: session.sub } });
  const count = await prisma.like.count({ where: { blogId: id } });
  return jsonSuccess({ liked: false, count });
}
