import { timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import { jsonError, jsonSuccess } from "@/lib/utils/api-response";
import { adminProvisioningSchema } from "@/lib/validation/auth";

function getAllowedOrigins(request: NextRequest) {
  return new Set(
    [
      request.url,
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.RENDER_EXTERNAL_URL,
    ].flatMap((value) => {
      if (!value) return [];
      try {
        return [new URL(value).origin];
      } catch {
        return [];
      }
    })
  );
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || !getAllowedOrigins(request).has(origin)) {
    return jsonError("Request origin is not allowed", 403);
  }

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return jsonError("Expected a JSON request", 415);
  }

  const configuredKey = process.env.ADMIN_PROVISIONING_KEY;
  if (!configuredKey || configuredKey.length < 8) {
    return jsonError("Admin provisioning is not configured on this server", 503);
  }

  try {
    const parsed = adminProvisioningSchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError("Invalid admin account details", 400, parsed.error.flatten());
    }

    const submittedKey = Buffer.from(parsed.data.provisioningKey);
    const expectedKey = Buffer.from(configuredKey);
    if (
      submittedKey.length !== expectedKey.length ||
      !timingSafeEqual(submittedKey, expectedKey)
    ) {
      return jsonError("Invalid provisioning key", 403);
    }

    const email = parsed.data.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return jsonError("Email already registered", 409);

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email,
        passwordHash: await hashPassword(parsed.data.password),
        role: "ADMIN",
      },
      select: { id: true, name: true, email: true, role: true },
    });

    return jsonSuccess({ user }, 201);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError("Email already registered", 409);
    }

    console.error("Admin provisioning failed", error);
    return jsonError("Unable to create admin account", 500);
  }
}
