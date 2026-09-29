import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/api";
import { employeeSchema } from "@/lib/validation/auth";
import { hashPassword } from "@/lib/auth/password";
import { jsonError, jsonSuccess } from "@/lib/utils/api-response";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireAuth(["ADMIN"]);
  if (error) return error;
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { blogs: true } },
      blogs: {
        take: 10,
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, status: true, views: true },
      },
    },
  });
  if (!user || user.role !== "EMPLOYEE") return jsonError("Not found", 404);
  return jsonSuccess(user);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { error } = await requireAuth(["ADMIN"]);
  if (error) return error;
  const { id } = await params;

  const body = await request.json();
  const parsed = employeeSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid data", 400);

  const data: { name?: string; email?: string; passwordHash?: string } = {};
  if (parsed.data.name) data.name = parsed.data.name;
  if (parsed.data.email) data.email = parsed.data.email.toLowerCase();
  if (parsed.data.password) data.passwordHash = await hashPassword(parsed.data.password);

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true },
  });
  return jsonSuccess(user);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error } = await requireAuth(["ADMIN"]);
  if (error) return error;
  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== "EMPLOYEE") return jsonError("Not found", 404);

  await prisma.user.delete({ where: { id } });
  return jsonSuccess({ deleted: true });
}
