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

  const comments = await prisma.comment.findMany({
    where: { blogId: id },
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return jsonSuccess(comments);
}

export async function POST(request: NextRequest, { params }: Params) {
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

  const body: unknown = await request.json();
  if (
    typeof body !== "object" ||
    body === null ||
    !("content" in body) ||
    typeof body.content !== "string"
  ) {
    return jsonError("Comment is required", 400);
  }
  const content = body.content.trim();
  if (content.length < 1 || content.length > 2000) {
    return jsonError("Comments must be between 1 and 2000 characters", 400);
  }

  const comment = await prisma.comment.create({
    data: { blogId: id, authorId: session.sub, content },
    include: { author: { select: { id: true, name: true } } },
  });
  return jsonSuccess(comment, 201);
}
