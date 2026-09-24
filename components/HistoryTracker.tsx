"use client";

import { useEffect } from "react";
import { pushHistory } from "@/lib/history";

export function HistoryTracker({
  slug,
  title,
  ep,
  cover,
  src,
  t,
}: {
  slug: string;
  title: string;
  ep: string;
  cover?: string;
  src?: string;
  t?: number;
}) {
  useEffect(() => {
    pushHistory({ slug, title, ep, cover, src, t });
  }, [slug, title, ep, cover, src, t]);

  return null;
}
