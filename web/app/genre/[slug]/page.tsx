import { notFound } from "next/navigation";
import { AnimeGrid } from "@/components/AnimeCard";
import { Pager } from "@/components/Pager";
import { getList, resolveGenre } from "@/lib/api";

export const revalidate = 600;

type Params = { slug: string };
type SP = { page?: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const g = await resolveGenre(slug);
  return { title: g ? g.name : "Genre" };
}

export default async function GenrePage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SP>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const genre = await resolveGenre(slug);
  if (!genre) notFound();

  const r = await getList(
    {
      animegenre: genre.id,
      orderby: "modified",
      order: "desc",
      per_page: 24,
      page,
    },
    600,
  );

  return (
    <>
      <h1 className="page-title">{genre.name}</h1>
      <p className="page-sub">{r.total ?? r.items.length} judul · halaman {page}</p>
      <AnimeGrid items={r.items} />
      <Pager page={page} totalPages={r.totalPages ?? 1} basePath={`/genre/${genre.slug}`} />
    </>
  );
}
