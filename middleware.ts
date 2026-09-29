import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { AUTH_COOKIE, type SessionPayload } from "@/lib/auth/jwt";

const employeePaths = ["/dashboard/employee"];
const adminPaths = ["/dashboard/admin"];

async function getSession(request: NextRequest): Promise<SessionPayload | null> {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await getSession(request);

  if (pathname.startsWith("/dashboard")) {
    if (!session) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }
    if (session.role === "READER") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (adminPaths.some((p) => pathname.startsWith(p)) && session.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/forbidden", request.url));
    }
    if (
      employeePaths.some((p) => pathname.startsWith(p)) &&
      session.role !== "EMPLOYEE" &&
      session.role !== "ADMIN"
    ) {
      return NextResponse.redirect(new URL("/forbidden", request.url));
    }
  }

  if ((pathname === "/login" || pathname === "/signup") && session) {
    const dest =
      session.role === "ADMIN"
        ? "/dashboard/admin"
        : session.role === "EMPLOYEE"
          ? "/dashboard/employee"
          : "/";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup"],
};
