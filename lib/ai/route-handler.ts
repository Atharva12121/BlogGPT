import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/api";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { aiTextSchema } from "@/lib/validation/ai";
import { jsonError, jsonSuccess } from "@/lib/utils/api-response";
import {
  AIQuotaExceededError,
  AIRequestTimeoutError,
  AIServiceBusyError,
  AIUnavailableError,
  getPublishedBlogContext,
  runAiAction,
} from "@/lib/ai/actions";

const publicActions = new Set([
  "summarize",
  "key-points",
  "explain-simple",
  "translate",
  "faqs",
  "ask",
  "shorter",
  "difficult",
  "beginner",
]);

const adminActions = new Set([
  "admin-quality",
  "admin-insights",
  "admin-categories",
  "admin-tags",
  "admin-seo-audit",
  "admin-performance",
]);

export function createAiRoute(defaultAction: string, options?: { public?: boolean; admin?: boolean }) {
  return async function POST(request: NextRequest) {
    try {
      const ip = request.headers.get("x-forwarded-for") || "local";
      if (!checkRateLimit(`ai:${ip}`)) {
        return jsonError("Too many AI requests. Please wait a moment.", 429);
      }

      const body = await request.json();
      const parsed = aiTextSchema.safeParse(body);
      if (!parsed.success) return jsonError("Invalid request", 400);

      const action = parsed.data.action || defaultAction;
      const isPublic = options?.public || publicActions.has(action);
      const isAdmin = options?.admin || adminActions.has(action);

      if (isPublic) {
        // public viewer AI — no auth required but needs published blog context
      } else if (isAdmin) {
        const { error } = await requireAuth(["ADMIN"]);
        if (error) return error;
      } else {
        const { error } = await requireAuth(["ADMIN", "EMPLOYEE"]);
        if (error) return error;
      }

      let context = parsed.data.context;
      if (parsed.data.blogId) {
        context = await getPublishedBlogContext(parsed.data.blogId);
      }

      const result = await runAiAction(action, {
        ...parsed.data,
        context,
      });

      return jsonSuccess({ result });
    } catch (e) {
      if (e instanceof AIUnavailableError) {
        return jsonError(e.message, 503);
      }
      if (e instanceof AIServiceBusyError) {
        return jsonError(e.message, 503);
      }
      if (e instanceof AIRequestTimeoutError) {
        return jsonError(e.message, 504);
      }
      if (e instanceof AIQuotaExceededError) {
        return jsonError(e.message, 429);
      }
      const message = e instanceof Error ? e.message : "AI request failed";
      return jsonError(message, 500);
    }
  };
}
