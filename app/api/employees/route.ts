import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/api";
import { employeeSchema } from "@/lib/validation/auth";
import { hashPassword } from "@/lib/auth/password";
import { jsonError, jsonSuccess } from "@/lib/utils/api-response";

export async function GET() {
  const { error } = await requireAuth(["ADMIN"]);
  if (error) return error;

  const [employees, blogMetrics] = await Promise.all([
    prisma.user.findMany({
    where: { role: "EMPLOYEE" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      _count: { select: { blogs: true } },
    },
    orderBy: { createdAt: "desc" },
    }),
    prisma.blog.findMany({
      where: { author: { role: "EMPLOYEE" } },
      select: {
        authorId: true,
        views: true,
        _count: { select: { likes: true, comments: true } },
      },
    }),
  ]);

  const metricsByEmployee = new Map<string, { totalViews: number; totalLikes: number; totalComments: number }>();
  for (const blog of blogMetrics) {
    const metrics = metricsByEmployee.get(blog.authorId) ?? {
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
    };
    metrics.totalViews += blog.views;
    metrics.totalLikes += blog._count.likes;
    metrics.totalComments += blog._count.comments;
    metricsByEmployee.set(blog.authorId, metrics);
  }

  return jsonSuccess(employees.map((employee) => ({
    ...employee,
    ...(metricsByEmployee.get(employee.id) ?? {
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
    }),
  })));
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth(["ADMIN"]);
  if (error) return error;

  const body = await request.json();
  const parsed = employeeSchema.safeParse(body);
  if (!parsed.success || !parsed.data.password) {
    return jsonError("Invalid employee data", 400);
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return jsonError("Email already exists", 409);

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash: await hashPassword(parsed.data.password),
      role: "EMPLOYEE",
    },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  return jsonSuccess(user, 201);
}
