import { requireAuth } from "@/lib/auth/api";
import {
  getAnalyticsAvailability,
  getEmployeeStats,
  validateAnalyticsDateRange,
} from "@/lib/services/stats";
import type { AnalyticsRange } from "@/lib/services/stats";
import { jsonError, jsonSuccess } from "@/lib/utils/api-response";

function parseRange(value: string | null): AnalyticsRange {
  if (value === "day" || value === "month" || value === "year" || value === "custom") return value;
  return "all";
}

export async function GET(request: Request) {
  const { session, error } = await requireAuth(["ADMIN", "EMPLOYEE"]);
  if (error || !session) return error!;
  const params = new URL(request.url).searchParams;
  const range = parseRange(params.get("range"));
  const startDate = params.get("startDate");
  const endDate = params.get("endDate");
  if (range === "custom") {
    const message = validateAnalyticsDateRange(
      startDate,
      endDate,
      await getAnalyticsAvailability(session.sub)
    );
    if (message) return jsonError(message, 400);
  }
  const stats = await getEmployeeStats(
    session.sub,
    range,
    startDate ?? undefined,
    endDate ?? undefined
  );
  return jsonSuccess(stats);
}
