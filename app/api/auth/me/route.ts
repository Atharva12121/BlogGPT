import { prisma } from "@/lib/db/prisma";
import { getSessionFromCookies } from "@/lib/auth/jwt";
import { jsonError, jsonSuccess } from "@/lib/utils/api-response";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return jsonError("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, name: true, email: true, role: true, avatar: true },
  });
  if (!user) return jsonError("Unauthorized", 401);
  return jsonSuccess({ user });
}
