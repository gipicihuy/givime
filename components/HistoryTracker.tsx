"use client";

import { useEffect } from "react";
import { pushHistory } from "@/lib/history";

export function HistoryTracker({
  slug,
  title,
  ep,
  cover,
  t,
}: {
  slug: string;
  title: string;
  ep: string;
  cover?: string;
  t?: number;
}) {
  useEffect(() => {
    pushHistory({ slug, title, ep, cover, t });
  }, [slug, title, ep, cover, t]);

  return null;
}
