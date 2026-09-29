import { requireAuth } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";
import { canUnpublishBlog } from "@/lib/permissions";
import { jsonError, jsonSuccess } from "@/lib/utils/api-response";
import { blogInclude } from "@/lib/services/blog";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { session, error } = await requireAuth(["ADMIN", "EMPLOYEE"]);
  if (error) return error;
  const { id } = await params;

  const blog = await prisma.blog.findUnique({ where: { id } });
  if (!blog) return jsonError("Blog not found", 404);
  if (!canUnpublishBlog(session!, blog.authorId)) {
    return jsonError("Forbidden", 403);
  }

  const updated = await prisma.blog.update({
    where: { id },
    data: { status: "UNPUBLISHED" },
    include: blogInclude,
  });

  return jsonSuccess(updated);
}
