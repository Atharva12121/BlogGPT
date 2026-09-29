import { sanitizeHtml } from "@/lib/utils/sanitize";

export function BlogContent({ html }: { html: string }) {
  const safe = sanitizeHtml(html);
  return (
    <article
      className="prose-blog mx-auto max-w-3xl"
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
