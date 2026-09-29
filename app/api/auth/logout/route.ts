import { AUTH_COOKIE, authCookieOptions } from "@/lib/auth/jwt";
import { jsonSuccess } from "@/lib/utils/api-response";

export async function POST() {
  const response = jsonSuccess({ ok: true });
  response.cookies.set(AUTH_COOKIE, "", { ...authCookieOptions(0), maxAge: 0 });
  return response;
}
