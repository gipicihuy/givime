export type HistoryEntry = {
  slug: string;
  title: string;
  ep: string;
  cover?: string;
  at: number;
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

export function pushHistory(entry: Omit<HistoryEntry, "at">) {
  if (typeof window === "undefined") return;
  try {
    const list = readHistory().filter((h) => h.slug !== entry.slug);
    list.unshift({ ...entry, at: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
    window.dispatchEvent(new Event("givime:history-updated"));
  } catch {
    /* ignore quota */
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
