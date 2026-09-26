import Link from "next/link";
import { IconChevronLeft } from "@/components/Icons";
import { SectionOrnament } from "@/components/Shelf";
import { chapterSlugOf, fetchKomikDetail } from "@/lib/komikindo";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const d = await fetchKomikDetail(slug);
  return { title: d?.title ?? "Komik" };
}

export default async function KomikDetailPage({ params }: Params) {
  const { slug } = await params;
  const d = await fetchKomikDetail(slug);

  if (!d) {
    return (
      <>
        <h1 className="page-title">Komik</h1>
        <div className="state" style={{ marginTop: 24 }}>
          <strong>Gak ketemu</strong>
          Judul ini lagi gagal diambil. Coba lagi beberapa saat.{" "}
          <Link href="/komik" className="muted meta-item">
            <IconChevronLeft size={14} />
            Kembali
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <p style={{ marginBottom: 4, fontSize: 14 }}>
        <Link href="/komik" className="muted meta-item">
          <IconChevronLeft size={14} />
          Kembali
        </Link>
      </p>

      <div className="komik-detail">
        <div className="komik-detail-cover">
          {d.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.image} alt="" width={300} height={450} />
          ) : (
            <div className="poster-placeholder">Tanpa cover</div>
          )}
          {d.rating ? <span className="poster-score">★ {d.rating}</span> : null}
        </div>

        <div className="komik-detail-main">
          <h1 className="page-title komik-detail-title">{d.title}</h1>

          {d.genres.length ? (
            <div className="genre-list">
              {d.genres.map((g) => (
                <span key={g.slug} className="genre-tag">
                  {g.name}
                </span>
              ))}
            </div>
          ) : null}

          {d.info.length ? (
            <dl className="info-grid">
              {d.info.map((row) => (
                <div key={row.label} className="info-item">
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </div>

      {d.synopsis ? (
        <section className="section">
          <div className="section-head">
            <h2 className="section-title">
              <span className="section-ornament" aria-hidden>
                <SectionOrnament />
              </span>
              Sinopsis
            </h2>
          </div>
          <p className="detail-synopsis">{d.synopsis}</p>
        </section>
      ) : null}

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">
            <span className="section-ornament" aria-hidden>
              <SectionOrnament />
            </span>
            Chapter
          </h2>
          <span className="ep-count">{d.chapters.length} chapter</span>
        </div>
        <div className="ep-grid">
          {d.chapters.map((c) => (
            <Link
              key={c.href}
              className="ep-link"
              href={`/komik/${slug}/baca/${encodeURIComponent(chapterSlugOf(c.href))}`}
            >
              Ch. {c.label}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
