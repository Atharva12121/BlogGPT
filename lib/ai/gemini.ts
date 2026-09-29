import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

export class AIUnavailableError extends Error {
  constructor() {
    super("AI features are currently unavailable. Configure GEMINI_API_KEY to enable them.");
    this.name = "AIUnavailableError";
  }
}

export class AIServiceBusyError extends Error {
  constructor() {
    super("The AI service is temporarily busy. Please try again in a few minutes.");
    this.name = "AIServiceBusyError";
  }
}

export class AIRequestTimeoutError extends Error {
  constructor() {
    super("The AI request timed out. Please try again.");
    this.name = "AIRequestTimeoutError";
  }
}

export class AIQuotaExceededError extends Error {
  constructor(providerMessage: string) {
    const retryDelay =
      providerMessage.match(/retry in\s+([\d.]+)\s*s/i)?.[1] ??
      providerMessage.match(/"retryDelay"\s*:\s*"([\d.]+)s"/i)?.[1];
    const retrySeconds = retryDelay ? Math.ceil(Number(retryDelay)) : undefined;
    const retryMessage =
      retrySeconds && Number.isFinite(retrySeconds)
        ? ` Google suggests retrying in about ${retrySeconds} seconds.`
        : "";

    super(
      `The Gemini API quota has been reached.${retryMessage} If it still fails, wait for your quota to reset or check your API limits and billing.`
    );
    this.name = "AIQuotaExceededError";
  }
}

function getClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AIUnavailableError();
  return new GoogleGenerativeAI(key);
}

export async function generateText(
  prompt: string,
  options?: { system?: string; timeoutMs?: number }
): Promise<string> {
  const client = getClient();
  const timeoutMs = options?.timeoutMs ?? 120000;
  const model = client.getGenerativeModel({
    model: DEFAULT_MODEL,
    systemInstruction: options?.system,
  }, { timeout: timeoutMs });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
      const text = result.response.text()?.trim();
      if (!text) throw new Error("Empty response from AI");
      return text;
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI request failed";
      if (/abort|timed out/i.test(message)) {
        throw new AIRequestTimeoutError();
      }
      if (/\b429\b|Too Many Requests|quota exceeded/i.test(message)) {
        throw new AIQuotaExceededError(message);
      }
      if (/\b503\b|Service Unavailable/i.test(message)) {
        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 750));
          continue;
        }
        throw new AIServiceBusyError();
      }
      throw new Error(message);
    }
  }
  throw new AIServiceBusyError();
}

export async function generateJson<T>(
  prompt: string,
  schema: z.ZodType<T>,
  system?: string
): Promise<T> {
  const raw = await generateText(
    `${prompt}\n\nRespond with valid JSON only, no markdown fences.`,
    { system }
  );
  let parsed: unknown;
  try {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "");
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("AI returned invalid JSON");
  }
  return schema.parse(parsed);
}

export const seoSchema = z.object({
  seoTitle: z.string(),
  metaDescription: z.string(),
  keywords: z.array(z.string()),
  slug: z.string().optional(),
});

export const outlineSchema = z.object({
  introduction: z.string(),
  sections: z.array(
    z.object({
      title: z.string(),
      subsections: z.array(z.string()).optional(),
    })
  ),
  conclusion: z.string(),
});
