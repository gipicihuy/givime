import { ContinueWatching } from "@/components/ContinueWatching";
import { FeaturedHero } from "@/components/FeaturedHero";
import { GenreSection } from "@/components/GenreSection";
import { Shelf } from "@/components/Shelf";
import {
  getDetail,
  getGenres,
  getList,
  IDS,
  isOngoingAnime,
  metaOf,
  type Anime,
  type Genre,
} from "@/lib/api";

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

async function hydrateFeatured(base: Anime[]): Promise<Anime[]> {
  const unique = base.filter(
    (a, i, arr) => a.slug && arr.findIndex((x) => x.slug === a.slug) === i,
  );
  const hydrated = await Promise.all(
    unique.slice(0, 4).map(async (a) => {
      try {
        const full = a.slug ? await getDetail(a.slug) : null;
        return full ?? a;
      } catch {
        return a;
      }
    }),
  );
  return hydrated.filter((a) => metaOf(a).ero_image || a.slug);
}

export default async function HomePage() {
  const [ongoing, top, completed, genresAll] = await Promise.all([
    safeList(
      { animestatus: IDS.status.ongoing, orderby: "modified", order: "desc", per_page: 12 },
      300,
    ),
    safeList({ animetop: IDS.top.ya, orderby: "modified", order: "desc", per_page: 12 }, 3600),
    safeList(
      { animestatus: IDS.status.completed, orderby: "date", order: "desc", per_page: 12 },
      3600,
    ),
    getGenres(100).catch(() => [] as Genre[]),
  ]);

  const genreItems = [...genresAll]
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    .slice(0, 24);

  const ongoingItems = ongoing.items.filter(isOngoingAnime);
  const topItems = [...top.items].sort(
    (a, b) =>
      Number(metaOf(b).ero_skor || 0) - Number(metaOf(a).ero_skor || 0),
  );

  const featuredSeeds = [
    ...topItems.filter((a) => metaOf(a).ero_image),
    ...ongoingItems.filter((a) => metaOf(a).ero_image),
    ...topItems,
    ...ongoingItems,
  ].slice(0, 4);

  const featured = await hydrateFeatured(featuredSeeds);
  const featuredSlugs = new Set(featured.map((a) => a.slug));

  const topRail = topItems.filter((a) => !featuredSlugs.has(a.slug));
  const ongoingRail = ongoingItems.filter((a) => !featuredSlugs.has(a.slug));

  return (
    <>
      <h1 className="sr-only">Givime — nonton anime</h1>
      {featured.length ? <FeaturedHero items={featured} /> : null}
      <ContinueWatching />
      <Shelf
        title="Ongoing"
        href="/ongoing"
        items={ongoingRail.length ? ongoingRail : ongoingItems}
      />
      <Shelf title="Top" items={topRail.length ? topRail : topItems} />
      <GenreSection genres={genreItems} />
      <Shelf title="Completed" href="/completed" items={completed.items} />
    </>
  );
}
