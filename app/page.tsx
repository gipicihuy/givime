import Link from "next/link";
import { AnimeGrid } from "@/components/AnimeCard";
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
  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-title">{title}</h2>
        {href ? (
          <Link href={href} className="section-more">
            Lihat semua →
          </Link>
        ) : null}
      </div>
      <AnimeGrid items={items} />
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
  const [ongoing, top, movie] = await Promise.all([
    safeList(
      { animestatus: IDS.status.ongoing, orderby: "modified", order: "desc", per_page: 8 },
      300,
    ),
    safeList({ animetop: IDS.top.ya, orderby: "modified", order: "desc", per_page: 8 }, 3600),
    safeList({ animetype: IDS.type.movie, orderby: "date", order: "desc", per_page: 8 }, 600),
  ]);

  return (
    <>
      <header style={{ marginBottom: 24 }}>
        <h1 className="page-title">Anime</h1>
        <p className="page-sub">Daftar ongoing, top, dan movie — filter dari karanime.</p>
      </header>
      <Section title="Ongoing" href="/ongoing" items={ongoing.items} />
      <Section title="Top" items={top.items} />
      <Section title="Movie" href="/movies" items={movie.items} />
    </>
  );
}
