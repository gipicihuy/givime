import Link from "next/link";
import { IconChevronLeft, IconChevronRight } from "@/components/Icons";

function pageItems(page: number, total: number): (number | "gap")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const set = new Set<number>([1, total, page]);
  for (const n of [page - 1, page + 1, page - 2, page + 2]) {
    if (n >= 1 && n <= total) set.add(n);
  }
  if (page <= 3) {
    for (const n of [2, 3, 4, 5]) if (n <= total) set.add(n);
  }
  if (page >= total - 2) {
    for (const n of [total - 1, total - 2, total - 3, total - 4]) {
      if (n >= 1) set.add(n);
    }
  }
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  let prev = 0;
  for (const n of sorted) {
    if (prev && n - prev > 1) out.push("gap");
    out.push(n);
    prev = n;
  }
  return out;
}

export function Pager({
  page,
  totalPages,
  basePath,
  searchKey,
  searchValue,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  searchKey?: string;
  searchValue?: string;
}) {
  if (totalPages <= 1) return null;

  function href(p: number) {
    if (p < 1 || p > totalPages) return "#";
    const params = new URLSearchParams();
    if (p > 1) params.set("page", String(p));
    if (searchKey && searchValue) params.set(searchKey, searchValue);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const items = pageItems(page, totalPages);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav className="pager" aria-label="Halaman">
      {hasPrev ? (
        <Link href={href(page - 1)} className="pager-arrow" aria-label="Halaman sebelumnya">
          <IconChevronLeft size={16} />
        </Link>
      ) : (
        <span className="pager-arrow is-disabled" aria-hidden>
          <IconChevronLeft size={16} />
        </span>
      )}

      <ol className="pager-pages">
        {items.map((it, i) =>
          it === "gap" ? (
            <li key={`gap-${i}`} className="pager-gap" aria-hidden>
              ·
            </li>
          ) : (
            <li key={it}>
              {it === page ? (
                <span className="pager-num is-current" aria-current="page">
                  {it}
                </span>
              ) : (
                <Link href={href(it)} className="pager-num">
                  {it}
                </Link>
              )}
            </li>
          ),
        )}
      </ol>

      {hasNext ? (
        <Link href={href(page + 1)} className="pager-arrow" aria-label="Halaman berikutnya">
          <IconChevronRight size={16} />
        </Link>
      ) : (
        <span className="pager-arrow is-disabled" aria-hidden>
          <IconChevronRight size={16} />
        </span>
      )}
    </nav>
  );
}
