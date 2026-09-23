import Link from "next/link";

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
        <Link href={href(prev)}>← Prev</Link>
      ) : (
        <span className="disabled">← Prev</span>
      )}
      <span>
        {page} / {totalPages}
      </span>
      {next ? (
        <Link href={href(next)}>Next →</Link>
      ) : (
        <span className="disabled">Next →</span>
      )}
    </nav>
  );
}
