import { AnimeGrid } from "@/components/AnimeCard";
import { Pager } from "@/components/Pager";
import { getList, IDS } from "@/lib/api";

export const revalidate = 600;
export const metadata = { title: "Movies" };

type SP = { page?: string };

export default async function MoviesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const r = await getList(
    {
      animetype: IDS.type.movie,
      orderby: "date",
      order: "desc",
      per_page: 24,
      page,
    },
    600,
  );

  return (
    <>
      <h1 className="page-title">Movies</h1>
      <p className="page-sub">{r.total ?? r.items.length} judul · halaman {page}</p>
      <AnimeGrid items={r.items} />
      <Pager page={page} totalPages={r.totalPages ?? 1} basePath="/movies" />
    </>
  );
}
