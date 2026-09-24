import Link from "next/link";
import { IconChevronLeft, IconChevronRight } from "@/components/Icons";

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

  const prev = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;

  return (
    <nav className="pager" aria-label="Halaman">
      {prev ? (
        <Link href={href(prev)}>
          <IconChevronLeft size={14} />
          Prev
        </Link>
      ) : (
        <span className="disabled">
          <IconChevronLeft size={14} />
          Prev
        </span>
      )}
      <span>
        {page} / {totalPages}
      </span>
      {next ? (
        <Link href={href(next)}>
          Next
          <IconChevronRight size={14} />
        </Link>
      ) : (
        <span className="disabled">
          Next
          <IconChevronRight size={14} />
        </span>
      )}
    </nav>
  );
}
