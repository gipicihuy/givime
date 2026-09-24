import Link from "next/link";
import { AnimeRail } from "@/components/AnimeCard";
import { IconChevronRight } from "@/components/Icons";
import { getList, IDS, type Anime } from "@/lib/api";

export const revalidate = 300;

function Section({
  title,
  href,
  items,
}: {
  title: string;
  href?: string;
  items: Anime[];
}) {
  if (!items.length) return null;
  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-title">{title}</h2>
        {href ? (
          <Link href={href} className="section-more">
            Lihat semua
            <IconChevronRight size={14} />
          </Link>
        ) : null}
      </div>
      <AnimeRail items={items} />
    </section>
  );
}

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
      <Section title="Ongoing" href="/ongoing" items={ongoing.items} />
      <Section title="Top" items={top.items} />
      <Section title="Movie" href="/movies" items={movie.items} />
      <Section title="Completed" href="/completed" items={completed.items} />
    </>
  );
}
