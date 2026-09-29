import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import {
  assertJwtSecretConfigured,
  authCookieOptions,
  AUTH_COOKIE,
  signToken,
} from "@/lib/auth/jwt";
import { loginSchema } from "@/lib/validation/auth";
import { jsonError, jsonSuccess } from "@/lib/utils/api-response";

export async function POST(request: NextRequest) {
  try {
    assertJwtSecretConfigured();
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        parsed.error.issues[0]?.message ?? "Invalid credentials",
        400,
        parsed.error.flatten()
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
    });
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return jsonError("Authentication failed", 401);
    }

    const token = await signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const response = jsonSuccess({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
    response.cookies.set(AUTH_COOKIE, token, authCookieOptions());
    return response;
  } catch (error) {
    console.error("Login failed", error);
    return jsonError("Unable to login", 500);
  }
}
