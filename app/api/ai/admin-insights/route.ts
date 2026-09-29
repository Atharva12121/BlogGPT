import { createAiRoute } from "@/lib/ai/route-handler";

export const POST = createAiRoute("admin-insights", { admin: true });
