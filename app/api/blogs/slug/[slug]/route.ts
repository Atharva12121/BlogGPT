import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { jsonError, jsonSuccess } from "@/lib/utils/api-response";
import { blogInclude } from "@/lib/services/blog";
import { cookies } from "next/headers";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { slug } = await params;
  const blog = await prisma.blog.findUnique({
    where: { slug },
    include: blogInclude,
  });
  if (!blog || blog.status !== "PUBLISHED") {
    return jsonError("Blog not found", 404);
  }

  const cookieStore = await cookies();
  const visitorKey = `bv_${blog.id}`;
  let visitorId = cookieStore.get("visitor_id")?.value;
  if (!visitorId) {
    visitorId = crypto.randomUUID();
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentView = await prisma.blogView.findFirst({
    where: {
      blogId: blog.id,
      visitorId,
      viewedAt: { gte: oneDayAgo },
    },
  });

  let views = blog.views;
  if (!recentView) {
    await prisma.$transaction([
      prisma.blogView.create({
        data: { blogId: blog.id, visitorId },
      }),
      prisma.blog.update({
        where: { id: blog.id },
        data: { views: { increment: 1 } },
      }),
    ]);
    views += 1;
  }

  const response = jsonSuccess({ ...blog, views });
  if (!cookieStore.get("visitor_id")?.value) {
    response.cookies.set("visitor_id", visitorId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  response.cookies.set(visitorKey, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return response;
}
