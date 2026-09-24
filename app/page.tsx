import { Shelf } from "@/components/Shelf";
import { getList, IDS, type Anime } from "@/lib/api";

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

  return (
    <>
      <header className="home-head">
        <h1 className="page-title">Givime</h1>
        <p className="page-sub">Nonton anime subtitle Indonesia</p>
      </header>
      <Shelf title="Ongoing" href="/ongoing" items={ongoing.items} />
      <Shelf title="Top" items={top.items} />
      <Shelf title="Movie" href="/movies" items={movie.items} />
      <Shelf title="Completed" href="/completed" items={completed.items} />
    </>
  );
}
