import { createAiRoute } from "@/lib/ai/route-handler";

export const POST = createAiRoute("summarize", { public: true });
