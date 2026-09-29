"use client";

import { useEffect } from "react";

export function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    fetch(`/api/blogs/slug/${slug}`).catch(() => undefined);
  }, [slug]);
  return null;
}
