"use client";

import { useEffect } from "react";
import { pushHistory, type HistoryEntry } from "@/lib/history";

export function HistoryTracker({
  slug,
  title,
  ep,
  cover,
  src,
  t,
  epSlug,
  kind,
}: {
  slug: string;
  title: string;
  ep: string;
  cover?: string;
  src?: string;
  t?: number;
  /** slug episode donghua (link player di history) */
  epSlug?: string;
  kind?: HistoryEntry["kind"];
}) {
  useEffect(() => {
    pushHistory({ slug, title, ep, cover, src, t, epSlug, kind });
  }, [slug, title, ep, cover, src, t, epSlug, kind]);

  return null;
}
