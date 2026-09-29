"use client";

import { useState } from "react";
import { Copy, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAI } from "@/hooks/useAI";
import { toast } from "sonner";

type Action = { label: string; endpoint: string; action?: string; tone?: string };

const employeeActions: Action[] = [
  { label: "Improve Writing", endpoint: "/api/ai/improve" },
  { label: "Fix Grammar", endpoint: "/api/ai/grammar" },
  { label: "Generate Title", endpoint: "/api/ai/title" },
  { label: "Generate Tags", endpoint: "/api/ai/tags" },
  { label: "Generate Excerpt", endpoint: "/api/ai/excerpt" },
  { label: "SEO Suggestions", endpoint: "/api/ai/seo" },
  { label: "Generate Outline", endpoint: "/api/ai/outline", action: "generate-outline" },
  { label: "Generate Draft", endpoint: "/api/ai/generate", action: "generate-draft" },
  { label: "Rewrite (Professional)", endpoint: "/api/ai/improve", action: "rewrite", tone: "professional" },
  { label: "Content Review", endpoint: "/api/ai/assist", action: "review" },
];

type Props = {
  text: string;
  title?: string;
  topic?: string;
  onApply: (value: string) => void;
};

export function AiAssistantPanel({ text, title, topic, onApply }: Props) {
  const { run } = useAI();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [instruction, setInstruction] = useState("");

  const showResult = (res: Awaited<ReturnType<typeof run>>) => {
    if (!res) return;
    if (typeof res === "string") {
      setResult(res);
    } else if ("titles" in res && Array.isArray(res.titles)) {
      setResult(res.titles.join("\n"));
    } else if ("tags" in res && Array.isArray(res.tags)) {
      setResult(res.tags.join(", "));
    } else {
      setResult(JSON.stringify(res, null, 2));
    }
  };

  const execute = async (action: Action) => {
    setLoading(true);
    setResult("");
    try {
      const res = await run(action.endpoint, {
        text,
        title,
        topic,
        action: action.action,
        tone: action.tone,
      });
      showResult(res);
    } finally {
      setLoading(false);
    }
  };

  const executeCustom = async () => {
    const customInstruction = instruction.trim();
    if (!customInstruction) return;
    setLoading(true);
    setResult("");
    try {
      const res = await run("/api/ai/assist", {
        text,
        title,
        topic,
        action: "custom",
        instruction: customInstruction,
      });
      showResult(res);
    } finally {
      setLoading(false);
    }
  };

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(result);
      toast.success("AI result copied.");
    } catch {
      toast.error("Unable to copy the AI result.");
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4">
      <Button type="button" variant="outline" className="w-full" onClick={() => setOpen((v) => !v)}>
        <Sparkles className="h-4 w-4 text-accent" />
        AI Writing Assistant
      </Button>
      {open && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {employeeActions.map((a) => (
              <Button
                key={a.label}
                type="button"
                size="sm"
                variant="secondary"
                disabled={loading || !text.trim()}
                onClick={() => execute(a)}
              >
                {a.label}
              </Button>
            ))}
          </div>
          <div className="space-y-2">
            <Textarea
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              placeholder="Ask AI to do something else with your blog content..."
              aria-label="Custom AI instruction"
              rows={3}
              maxLength={1000}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={loading || !text.trim() || !instruction.trim()}
              onClick={executeCustom}
            >
              Run Custom Request
            </Button>
          </div>
          {loading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              AI is thinking...
            </p>
          )}
          {result && (
            <div className="space-y-2">
              <Textarea value={result} readOnly rows={8} aria-label="AI suggestion" />
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={copyResult}>
                  <Copy className="h-4 w-4" aria-hidden />
                  Copy
                </Button>
                <Button type="button" size="sm" onClick={() => onApply(result)}>
                  Accept
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setResult("")}>
                  Dismiss
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
