import { prisma } from "@/lib/db/prisma";
import { getSessionFromCookies } from "@/lib/auth/jwt";
import { jsonError } from "@/lib/utils/api-response";
import type { Role } from "@prisma/client";

export async function requireAuth(roles?: Role[]) {
  const tokenSession = await getSessionFromCookies();
  if (!tokenSession) {
    return { session: null, error: jsonError("Unauthorized", 401) };
  }

  const user = await prisma.user.findUnique({
    where: { id: tokenSession.sub },
    select: { email: true, name: true, role: true },
  });
  if (!user) {
    return { session: null, error: jsonError("Unauthorized", 401) };
  }

  const session = { ...tokenSession, ...user };
  if (roles && !roles.includes(session.role)) {
    return { session: null, error: jsonError("Forbidden", 403) };
  }
  return { session, error: null };
}
