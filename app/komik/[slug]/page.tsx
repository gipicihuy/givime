import Link from "next/link";
import { IconPlay, IconStar } from "@/components/Icons";
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
            Kembali
          </Link>
        </div>
      </>
    );
  }

  const infoOf = (label: string) => d.info.find((r) => r.label === label)?.value ?? "";
  const status = infoOf("Status");
  const type = infoOf("Jenis Komik");
  const released = infoOf("Dirilis");
  const firstChapter = d.chapters[0];

  const chHref = (href: string) =>
    `/komik/${slug}/baca/${encodeURIComponent(chapterSlugOf(href))}`;

  return (
    <article className="detail">
      <header className="detail-hero">
        <div className="detail-hero-backdrop" aria-hidden="true">
          {d.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.image} alt="" width={880} height={1320} />
          ) : null}
        </div>
        <div className="detail-hero-scrim" aria-hidden="true" />

        <div className="detail-hero-inner">
          <div className="detail-poster">
            {d.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="detail-cover" src={d.image} alt="" width={440} height={660} />
            ) : (
              <div className="detail-cover detail-cover-ph">Tanpa cover</div>
            )}
          </div>

          <div className="detail-info">
            <div className="detail-badges">
              {status ? (
                <span
                  className={
                    status === "Berjalan" ? "chip chip-ongoing" : "chip chip-completed"
                  }
                >
                  {status}
                </span>
              ) : null}
              {type ? <span className="chip">{type}</span> : null}
            </div>

            <h1 className="detail-title">{d.title}</h1>

            <div className="detail-meta">
              {released ? <span>{released}</span> : null}
              <span>{d.chapters.length} Chapter</span>
              {d.rating ? (
                <span className="meta-item meta-score">
                  <IconStar size={12} />
                  {d.rating}
                </span>
              ) : null}
            </div>

            {d.genres.length ? (
              <div className="detail-genres">
                {d.genres.map((g) => (
                  <span key={g.slug} className="genre-chip">
                    {g.name}
                  </span>
                ))}
              </div>
            ) : null}

            {firstChapter ? (
              <div className="detail-actions">
                <Link href={chHref(firstChapter.href)} className="btn-play">
                  <IconPlay size={14} />
                  Baca Ch. {firstChapter.label}
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="detail-body">
        {d.synopsis ? (
          <section className="detail-block">
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

        <section className="detail-block">
          <div className="section-head">
            <h2 className="section-title">
              <span className="section-ornament" aria-hidden>
                <SectionOrnament />
              </span>
              Info
            </h2>
          </div>
          <dl className="info-grid">
            {d.info.map((row) => (
              <div key={row.label} className="info-item">
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
            <div className="info-item">
              <dt>Chapter</dt>
              <dd>{d.chapters.length} tersedia</dd>
            </div>
          </dl>
        </section>

        <section className="detail-block">
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
              <Link key={c.href} className="ep-link" href={chHref(c.href)}>
                Ch. {c.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </article>
  );
}
