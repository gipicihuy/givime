import { AnimeGrid } from "@/components/AnimeCard";
import { Pager } from "@/components/Pager";
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
        <h1 className="page-title">Cari anime</h1>
        <div className="state">
          <strong>Masukkan kata kunci</strong>
          Pakai kotak pencarian di header, misal “one piece”.
        </div>
      </>
    );
  }

  const r = await searchAnime(q, page, 12);

  return (
    <>
      <h1 className="page-title">“{q}”</h1>
      <p className="page-sub">
        {r.total ?? r.items.length} hasil · halaman {page}
      </p>
      <AnimeGrid items={r.items} />
      <Pager page={page} totalPages={r.totalPages ?? 1} basePath="/search" searchKey="q" searchValue={q} />
    </>
  );
}
