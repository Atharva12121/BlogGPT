import type { Role } from "@prisma/client";
import type { SessionPayload } from "@/lib/auth/jwt";

export function isAdmin(session: SessionPayload | null): boolean {
  return session?.role === "ADMIN";
}

export function isEmployee(session: SessionPayload | null): boolean {
  return session?.role === "EMPLOYEE" || session?.role === "ADMIN";
}

export function canManageEmployees(session: SessionPayload | null): boolean {
  return isAdmin(session);
}

export function canEditBlog(
  session: SessionPayload | null,
  authorId: string,
  status: string
): boolean {
  if (!session) return false;
  if (session.role === "ADMIN") return true;
  if (session.sub !== authorId) return false;
  return true;
}

export function canDeleteBlog(
  session: SessionPayload | null,
  authorId: string,
  status: string
): boolean {
  if (!session) return false;
  if (session.role === "ADMIN") return true;
  if (session.sub !== authorId) return false;
  return status === "DRAFT";
}

export function canPublishBlog(
  session: SessionPayload | null,
  authorId: string
): boolean {
  if (!session) return false;
  if (session.role === "ADMIN") return true;
  return session.sub === authorId;
}

export function canUnpublishBlog(
  session: SessionPayload | null,
  authorId: string
): boolean {
  if (!session) return false;
  if (session.role === "ADMIN") return true;
  return session.sub === authorId;
}

export function requireRole(
  session: SessionPayload | null,
  roles: Role[]
): boolean {
  if (!session) return false;
  return roles.includes(session.role);
}
