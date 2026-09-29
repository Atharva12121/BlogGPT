"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAI } from "@/hooks/useAI";

const actions = [
  { label: "Summarize", endpoint: "/api/ai/summarize", action: "summarize" },
  { label: "Key Points", endpoint: "/api/ai/summarize", action: "key-points" },
  { label: "Explain Simply", endpoint: "/api/ai/summarize", action: "explain-simple" },
  { label: "Beginner Friendly", endpoint: "/api/ai/summarize", action: "beginner" },
  { label: "Shorter Version", endpoint: "/api/ai/summarize", action: "shorter" },
  { label: "FAQs", endpoint: "/api/ai/summarize", action: "faqs" },
];

export function ViewerAiPanel({ blogId }: { blogId: string }) {
  const { run } = useAI();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [language, setLanguage] = useState("");
  const [question, setQuestion] = useState("");

  const call = async (endpoint: string, action: string, extra?: Record<string, string>) => {
    setLoading(true);
    setResult("");
    const res = await run(endpoint, { blogId, action, ...extra });
    setLoading(false);
    if (typeof res === "string") setResult(res);
  };

  return (
    <aside className="rounded-xl border bg-card p-5" aria-label="AI reading assistant">
      <h2 className="mb-3 flex items-center gap-2 font-semibold">
        <Sparkles className="h-4 w-4 text-accent" aria-hidden />
        AI Reading Assistant
      </h2>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <Button
            key={a.label}
            size="sm"
            variant="secondary"
            disabled={loading}
            onClick={() => call(a.endpoint, a.action)}
          >
            {a.label}
          </Button>
        ))}
        <Button
          size="sm"
          variant="secondary"
          disabled={loading || !language.trim()}
          onClick={() => call("/api/ai/translate", "translate", { language: language.trim() })}
        >
          Translate
        </Button>
      </div>
      <div className="mt-3 flex gap-2">
        <Input
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          placeholder="Translation language"
          aria-label="Translation language"
        />
      </div>
      <div className="mt-4 space-y-2">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about this blog"
          aria-label="Question about blog"
        />
        <Button
          size="sm"
          disabled={loading || !question.trim()}
          onClick={() => call("/api/ai/summarize", "ask", { text: question })}
        >
          Ask AI
        </Button>
      </div>
      {loading && (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          AI is thinking...
        </p>
      )}
      {result && (
        <Textarea className="mt-3" readOnly rows={10} value={result} aria-label="AI response" />
      )}
    </aside>
  );
}
