import { prisma } from "@/lib/db/prisma";
import {
  AIUnavailableError,
  AIServiceBusyError,
  AIRequestTimeoutError,
  AIQuotaExceededError,
  generateJson,
  generateText,
  outlineSchema,
  seoSchema,
} from "@/lib/ai/gemini";
import { z } from "zod";

export async function getPublishedBlogContext(blogId?: string) {
  if (!blogId) return "";
  const blog = await prisma.blog.findUnique({ where: { id: blogId } });
  if (!blog || blog.status !== "PUBLISHED") {
    throw new Error("Blog content unavailable");
  }
  return blog.content.slice(0, 12000);
}

export async function runAiAction(action: string, input: {
  text?: string;
  context?: string;
  tone?: string;
  language?: string;
  instruction?: string;
  topic?: string;
  title?: string;
  blogId?: string;
}) {
  const text = input.text || "";
  const context = input.context || "";

  switch (action) {
    case "generate-outline":
      return generateJson(
        `Create a detailed blog outline for topic: ${input.topic || text}`,
        outlineSchema,
        "You are an expert editorial assistant."
      );
    case "generate-draft":
      return generateText(
        `Write a blog draft in HTML (use p, h2, ul, li tags only) about: ${input.topic || input.title || text}`,
        { system: "Return clean HTML fragments only." }
      );
    case "improve":
      return generateText(`Improve this text while preserving meaning:\n\n${text}`);
    case "grammar":
      return generateText(
        `Fix grammar, spelling, punctuation, and sentence structure:\n\n${text}`
      );
    case "rewrite":
      return generateText(
        `Rewrite in a ${input.tone || "professional"} tone:\n\n${text}`
      );
    case "title":
      return generateJson(
        `Suggest 5 blog titles for:\n${text || input.title}`,
        z.object({ titles: z.array(z.string()).min(1) })
      );
    case "excerpt":
      return generateText(
        `Write a concise homepage excerpt (max 160 chars) for:\n${text || input.title}`
      );
    case "tags":
      return generateJson(
        `Suggest 5-8 relevant tags for:\n${text}`,
        z.object({ tags: z.array(z.string()) })
      );
    case "category":
      return generateText(
        `Suggest the best category name (2-4 words) for this content:\n${text}`
      );
    case "seo":
      return generateJson(
        `Provide SEO metadata for this blog:\nTitle: ${input.title}\n\n${text}`,
        seoSchema
      );
    case "simplify":
      return generateText(`Simplify this content for easier reading:\n\n${text}`);
    case "expand":
      return generateText(`Expand this content while preserving meaning:\n\n${text}`);
    case "continue":
      return generateText(`Continue writing naturally from:\n\n${text}`);
    case "review":
      return generateText(
        `Review for clarity, readability, repetition, grammar, structure, and missing info:\n\n${text}`
      );
    case "custom":
      if (!input.instruction?.trim()) {
        throw new Error("A custom AI instruction is required");
      }
      return generateText(
        `Follow this instruction for the blog content below:\n${input.instruction}\n\nBlog title: ${input.title || "Untitled"}\n\nBlog content:\n${text}`,
        { system: "Follow the user's instruction while grounding your response in the provided blog content." }
      );
    case "summarize":
      return generateText(
        `Summarize the following blog content accurately:\n\n${context || text}`,
        { system: "Only use provided content. Do not invent facts." }
      );
    case "key-points":
      return generateText(
        `List key bullet points from:\n\n${context || text}`,
        { system: "Only use provided content." }
      );
    case "explain-simple":
      return generateText(
        `Explain in simple language:\n\n${context || text}`,
        { system: "Only use provided content." }
      );
    case "translate":
      if (!input.language?.trim()) {
        throw new Error("A translation language is required");
      }
      return generateText(
        `Translate to ${input.language}:\n\n${context || text}`,
        { system: "Preserve meaning. Only translate provided content." }
      );
    case "faqs":
      return generateText(
        `Generate FAQs based only on this blog:\n\n${context || text}`
      );
    case "ask":
      return generateText(
        `Answer based ONLY on this blog content.\n\nBlog:\n${context}\n\nQuestion:\n${text}`
      );
    case "shorter":
      return generateText(`Create a shorter version:\n\n${context || text}`);
    case "difficult":
      return generateText(
        `Explain difficult sections for beginners:\n\n${context || text}`
      );
    case "beginner":
      return generateText(
        `Give a beginner-friendly explanation:\n\n${context || text}`
      );
    case "admin-quality":
      return generateText(
        `Analyze blog quality (readability, grammar, structure, SEO, repetition, clarity):\n\n${text}`
      );
    case "admin-insights":
      return generateText(
        `Summarize employee publishing insights from this data:\n\n${text}`
      );
    case "admin-categories":
      return generateText(
        `Suggest better category organization from:\n\n${text}`
      );
    case "admin-tags":
      return generateText(
        `Identify duplicate/similar tags and cleanup suggestions:\n\n${text}`
      );
    case "admin-seo-audit":
      return generateText(`Run SEO audit on metadata and content:\n\n${text}`);
    case "admin-performance":
      return generateText(
        `Generate descriptive performance insights from stats:\n\n${text}`
      );
    default:
      throw new Error("Unknown AI action");
  }
}

export {
  AIQuotaExceededError,
  AIRequestTimeoutError,
  AIServiceBusyError,
  AIUnavailableError,
};
