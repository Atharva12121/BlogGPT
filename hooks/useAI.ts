"use client";

import { toast } from "sonner";

export function useAI() {
  const run = async (
    endpoint: string,
    payload: Record<string, unknown>
  ): Promise<string | Record<string, unknown> | null> => {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.message || "AI request failed");
        return null;
      }
      return json.data.result;
    } catch {
      toast.error("Could not connect to the AI service. Please try again.");
      return null;
    }
  };

  return { run };
}
