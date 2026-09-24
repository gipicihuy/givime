import Link from "next/link";
import { getGenres } from "@/lib/api";

export const revalidate = 86400;
export const metadata = { title: "Genres" };

export default async function GenresPage() {
  let genres: Awaited<ReturnType<typeof getGenres>> = [];
  try {
    genres = await getGenres();
  } catch {
    genres = [];
  }

  return (
    <>
      <h1 className="page-title">Genres</h1>
      <p className="page-sub">{genres.length} genre</p>
      <div className="genre-list">
        {genres.map((g) => (
          <Link key={g.id} href={`/genre/${g.slug}`} className="genre-tag">
            {g.name}
            {typeof g.count === "number" ? (
              <span className="muted" style={{ marginLeft: 6, fontSize: 12 }}>
                {g.count}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </>
  );
}
