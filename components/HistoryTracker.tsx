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
  kind,
}: {
  slug: string;
  title: string;
  ep: string;
  cover?: string;
  src?: string;
  t?: number;
  kind?: "anime" | "hentai";
}) {
  useEffect(() => {
    pushHistory({ slug, title, ep, cover, src, t, kind });
  }, [slug, title, ep, cover, src, t, kind]);

  return null;
}
