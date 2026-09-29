export function HighlightedText({
  text,
  query,
}: {
  text: string;
  query?: string;
}) {
  const terms = query?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (!terms.length) return text;

  const expression = new RegExp(
    `(${terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "gi"
  );
  return text.split(expression).map((part, index) =>
    terms.some((term) => part.toLowerCase() === term.toLowerCase()) ? (
      <mark key={`${index}-${part}`} className="rounded-sm bg-amber-200 px-0.5 text-amber-950 dark:bg-amber-400/30 dark:text-amber-100">
        {part}
      </mark>
    ) : (
      part
    )
  );
}
