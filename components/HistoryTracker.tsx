"use client";

import { useEffect } from "react";
import { pushHistory } from "@/lib/history";

export function HistoryTracker({
  slug,
  title,
  ep,
  cover,
}: {
  slug: string;
  title: string;
  ep: string;
  cover?: string;
}) {
  useEffect(() => {
    pushHistory({ slug, title, ep, cover });
  }, [slug, title, ep, cover]);

  return null;
}
