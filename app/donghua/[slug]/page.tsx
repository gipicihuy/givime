import Link from "next/link";
import { notFound } from "next/navigation";
import { DonghuaEpisodeList } from "@/components/Donghua";
import { IconPlay } from "@/components/Icons";
import { SectionOrnament } from "@/components/Shelf";
import { fetchDonghuaDetail } from "@/lib/anichin";

export const revalidate = 600;

type Params = { slug: string };

const SKIP_INFO = /diposting oleh|ditambahkan/i;

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  try {
    const d = await fetchDonghuaDetail(slug);
    return { title: d?.title ?? "Donghua" };
  } catch {
    return { title: "Donghua" };
  }
}

export default async function DonghuaDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  let d: Awaited<ReturnType<typeof fetchDonghuaDetail>> = null;
  try {
    d = await fetchDonghuaDetail(slug);
  } catch {
    d = null;
  }
  if (!d) notFound();

  const infoOf = (label: string) => d.info.find((r) => r.label === label)?.value ?? "";
  const status = infoOf("Status");
  const type = infoOf("Tipe") || "Donghua";
  const sub = infoOf("Subber");
  const duration = infoOf("Durasi");
  const released = infoOf("Tanggal rilis");
  const latest = d.latest;

  return (
    <article className="detail">
      <header className="detail-hero">
        <div className="detail-hero-backdrop" aria-hidden="true">
          {d.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.cover} alt="" width={880} height={1320} />
          ) : null}
        </div>
        <div className="detail-hero-scrim" aria-hidden="true" />

        <div className="detail-hero-inner">
          <div className="detail-poster">
            {d.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="detail-cover" src={d.cover} alt="" width={440} height={660} />
            ) : (
              <div className="detail-cover detail-cover-ph">Tanpa cover</div>
            )}
          </div>

          <div className="detail-info">
            <div className="detail-badges">
              {status ? (
                <span
                  className={
                    status === "Ongoing" ? "chip chip-ongoing" : "chip chip-completed"
                  }
                >
                  {status}
                </span>
              ) : null}
              {type ? <span className="chip">{type}</span> : null}
              {sub ? <span className="chip">{sub}</span> : null}
            </div>

            <h1 className="detail-title">{d.title}</h1>

            {d.altTitle ? <p className="detail-meta">{d.altTitle}</p> : null}

            <div className="detail-meta">
              {released ? <span>{released}</span> : null}
              {d.totalEpisodes ? <span>Ep {d.totalEpisodes}</span> : null}
              {duration ? <span>{duration.replace(/\s*per ep\s*/i, "")}</span> : null}
            </div>

            {d.genres.length ? (
              <div className="detail-genres">
                {d.genres.map((g) => (
                  <Link
                    key={g.slug}
                    href={`/donghua/genre/${g.slug}`}
                    className="genre-chip"
                  >
                    {g.name}
                  </Link>
                ))}
              </div>
            ) : null}

            {latest ? (
              <div className="detail-actions">
                <Link href={`/donghua/watch/${latest.slug}`} className="btn-play">
                  <IconPlay size={14} />
                  {latest.number ? `Putar Ep ${latest.number}` : "Putar terbaru"}
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
            {d.info
              .filter((r) => !SKIP_INFO.test(r.label))
              .map((r) => (
                <div className="info-item" key={r.label}>
                  <dt>{r.label}</dt>
                  <dd>{r.value}</dd>
                </div>
              ))}
          </dl>
        </section>

        <section className="detail-block">
          <DonghuaEpisodeList episodes={d.episodes} current={latest?.number} />
        </section>
      </div>
    </article>
  );
}
