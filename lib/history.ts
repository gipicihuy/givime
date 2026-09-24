export type HistoryEntry = {
  slug: string;
  title: string;
  ep: string;
  cover?: string;
  at: number;
  /** detik posisi terakhir ditonton */
  t?: number;
  /** detik total durasi video */
  d?: number;
};

const KEY = "givime:history";
const MAX = 40;

export function readHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function writeList(list: HistoryEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  window.dispatchEvent(new Event("givime:history-updated"));
}

export function pushHistory(entry: Omit<HistoryEntry, "at">) {
  if (typeof window === "undefined") return;
  try {
    const prev = readHistory().find((h) => h.slug === entry.slug);
    const list = readHistory().filter((h) => h.slug !== entry.slug);
    list.unshift({
      ...entry,
      t: entry.t ?? prev?.t,
      d: entry.d ?? prev?.d,
      at: Date.now(),
    });
    writeList(list);
  } catch {
    /* ignore quota */
  }
}

/** Update posisi tonton (t/d) tanpa ubah urutan. */
export function updateProgress(slug: string, t: number, d: number) {
  if (typeof window === "undefined") return;
  try {
    const list = readHistory();
    const idx = list.findIndex((h) => h.slug === slug);
    if (idx < 0) return;
    list[idx] = { ...list[idx], t, d };
    writeList(list);
  } catch {
    /* ignore */
  }
}

export function clearHistory() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new Event("givime:history-updated"));
  } catch {
    /* ignore */
  }
}

/** 12:10 / 1:02:03 */
export function fmtClock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const s = Math.floor(sec % 60);
  const m = Math.floor(sec / 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** 12:10/24:00 — null kalau belum ada progres */
export function fmtProgress(t?: number, d?: number): string | null {
  if (t == null || !Number.isFinite(t) || t < 1) return null;
  if (d != null && d > 0) return `${fmtClock(t)}/${fmtClock(d)}`;
  return fmtClock(t);
}
