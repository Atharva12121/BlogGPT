import { z } from "zod";

export const aiTextSchema = z.object({
  text: z.string().min(1).max(12000).optional(),
  context: z.string().max(20000).optional(),
  tone: z
    .enum([
      "professional",
      "friendly",
      "concise",
      "technical",
      "simple",
      "engaging",
    ])
    .optional(),
  language: z.string().trim().max(40).optional(),
  instruction: z.string().trim().max(1000).optional(),
  topic: z.string().max(500).optional(),
  title: z.string().max(300).optional(),
  blogId: z.string().optional(),
  action: z.string().optional(),
}).superRefine((data, ctx) => {
  if (!data.text?.trim() && !data.context?.trim() && !data.blogId?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Provide text or a blog ID",
      path: ["text"],
    });
  }

  if (data.action === "translate" && !data.language?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A translation language is required",
      path: ["language"],
    });
  }
});
