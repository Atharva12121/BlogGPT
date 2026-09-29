import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/api";
import { jsonError, jsonSuccess } from "@/lib/utils/api-response";

type Params = { params: Promise<{ id: string; commentId: string }> };

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth();
  if (error || !session) return error;
  if (session.role !== "ADMIN" && session.role !== "READER") {
    return jsonError("Forbidden", 403);
  }

  const { id, commentId } = await params;
  const comment = await prisma.comment.findFirst({
    where: { id: commentId, blogId: id },
    select: { id: true, authorId: true },
  });
  if (!comment) return jsonError("Comment not found", 404);
  if (session.role !== "ADMIN" && comment.authorId !== session.sub) {
    return jsonError("Forbidden", 403);
  }

  await prisma.comment.delete({ where: { id: commentId } });
  return jsonSuccess({ deleted: true });
}
