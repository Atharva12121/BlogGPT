import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import {
  assertJwtSecretConfigured,
  authCookieOptions,
  AUTH_COOKIE,
  signToken,
} from "@/lib/auth/jwt";
import { signupSchema } from "@/lib/validation/auth";
import { jsonError, jsonSuccess } from "@/lib/utils/api-response";

export async function POST(request: NextRequest) {
  try {
    assertJwtSecretConfigured();
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        parsed.error.issues[0]?.message ?? "Invalid signup data",
        400,
        parsed.error.flatten()
      );
    }

    const email = parsed.data.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return jsonError("Email already registered", 409);

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email,
        passwordHash,
        role: "READER",
      },
    });

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
      },
    });
    response.cookies.set(AUTH_COOKIE, token, authCookieOptions());
    return response;
  } catch (error) {
    console.error("Sign-up failed", error);
    return jsonError("Unable to sign up", 500);
  }
}
