import { FeaturedHero } from "@/components/FeaturedHero";
import { Shelf } from "@/components/Shelf";
import { getDetail, getList, IDS, metaOf, type Anime } from "@/lib/api";

export const revalidate = 300;

async function safeList(
  params: Record<string, string | number | undefined | null>,
  revalidate: number,
) {
  try {
    return await getList(params, revalidate);
  } catch {
    return { items: [] as Anime[], total: 0, totalPages: 1 };
  }
}

export default async function HomePage() {
  const [ongoing, top, movie, completed] = await Promise.all([
    safeList(
      { animestatus: IDS.status.ongoing, orderby: "modified", order: "desc", per_page: 12 },
      300,
    ),
    safeList({ animetop: IDS.top.ya, orderby: "modified", order: "desc", per_page: 12 }, 3600),
    safeList({ animetype: IDS.type.movie, orderby: "date", order: "desc", per_page: 12 }, 600),
    safeList(
      { animestatus: IDS.status.completed, orderby: "date", order: "desc", per_page: 12 },
      3600,
    ),
  ]);

  const featuredBase =
    top.items.find((a) => metaOf(a).ero_image) ??
    ongoing.items.find((a) => metaOf(a).ero_image) ??
    top.items[0] ??
    ongoing.items[0] ??
    null;

  let featured: Anime | null = featuredBase;
  if (featuredBase?.slug) {
    try {
      const full = await getDetail(featuredBase.slug);
      if (full) featured = full;
    } catch {
      // list row cukup buat hero
    }
  }

  const topRail = top.items.filter((a) => a.slug !== featured?.slug);

  return (
    <>
      <h1 className="sr-only">Givime — nonton anime</h1>
      {featured ? <FeaturedHero anime={featured} /> : null}
      <Shelf title="Ongoing" href="/ongoing" items={ongoing.items} index={1} />
      <Shelf title="Top" items={topRail.length ? topRail : top.items} index={2} />
      <Shelf title="Movie" href="/movies" items={movie.items} index={3} />
      <Shelf title="Completed" href="/completed" items={completed.items} index={4} />
    </>
  );
}
