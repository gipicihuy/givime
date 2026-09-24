import { AnimeGrid } from "@/components/AnimeCard";
import { IconEmpty } from "@/components/Icons";
import { Pager } from "@/components/Pager";
import { SearchBox } from "@/components/SearchBox";
import { searchAnime } from "@/lib/api";

export const dynamic = "force-dynamic";
export const metadata = { title: "Search" };

type SP = { q?: string; page?: string };

export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page) || 1);

  if (!q) {
    return (
      <>
        <h1 className="page-title">Cari</h1>
        <p className="page-sub">Ketik judul — saran muncul saat mengetik</p>
        <SearchBox />
        <div className="state state-follow">
          <strong>Mulai ketik</strong>
          Misal “one piece”, “solo leveling”, “spy x family”.
        </div>
      </>
    );
  }

  let r: Awaited<ReturnType<typeof searchAnime>>;
  try {
    r = await searchAnime(q, page, 12);
  } catch {
    r = { items: [], total: 0, totalPages: 1 };
  }

  return (
    <>
      <h1 className="page-title">Cari</h1>
      <p className="page-sub">
        {r.total ?? r.items.length} hasil untuk “{q}” · halaman {page}
      </p>
      <SearchBox />
      <div className="search-results">
        {r.items.length === 0 ? (
          <div className="state">
            <span className="state-icon" aria-hidden>
              <IconEmpty size={32} />
            </span>
            <strong>Tidak ada hasil</strong>
            Coba kata kunci lain, atau cek ejaan judulnya.
          </div>
        ) : (
          <AnimeGrid items={r.items} />
        )}
        <Pager page={page} totalPages={r.totalPages ?? 1} basePath="/search" searchKey="q" searchValue={q} />
      </div>
    </>
  );
}
