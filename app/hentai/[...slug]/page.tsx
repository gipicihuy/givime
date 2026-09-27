import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VideoPlayer } from "@/components/Episode";
import { HistoryTracker } from "@/components/HistoryTracker";
import { IconChevronLeft, IconChevronRight, IconPlay } from "@/components/Icons";
import { SectionOrnament } from "@/components/Shelf";
import StreamBusy from "@/components/StreamBusy";
import { fetchHentaiDetail, resolveHentaiStream } from "@/lib/ryukomik";

export const dynamic = "force-dynamic";

type Params = { slug: string[] };
type SP = { t?: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  try {
    const d = await fetchHentaiDetail(slug.filter(Boolean).join("/"));
    return { title: d?.title ?? "Hentai" };
  } catch {
    return { title: "Hentai" };
  }
}

function BlockHead({ children }: { children: ReactNode }) {
  return (
    <div className="section-head">
      <h2 className="section-title">
        <span className="section-ornament" aria-hidden>
          <SectionOrnament />
        </span>
        {children}
      </h2>
    </div>
  );
}

/** "… Episode 5 Subtitle Indonesia" → "5" */
function epNumberOf(title: string): string | null {
  const m = title.match(/episode[\s-]*(\d+)/i) || title.match(/\bep[\s.]+(\d+)/i);
  return m ? m[1] : null;
}

export default async function HentaiDetailPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SP>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const path = slug.filter(Boolean).join("/");
  if (!path) notFound();

  let detail: Awaited<ReturnType<typeof fetchHentaiDetail>> = null;
  try {
    detail = await fetchHentaiDetail(path);
  } catch {
    detail = null;
  }
  if (!detail) notFound();

  const isEpisode = detail.page === "episode";
  const stream = isEpisode
    ? await resolveHentaiStream(detail).catch(() => null)
    : null;

  const epNo = epNumberOf(detail.title);
  const epLabel = epNo ?? "—";
  const initialTime = Math.max(0, Number(sp.t) || 0);
  const cover = detail.thumb ?? detail.poster ?? undefined;
  const latestEp = detail.episodes.length ? detail.episodes[detail.episodes.length - 1] : null;

  const playerProps = {
    src: stream?.url ?? "",
    animeTitle: detail.title,
    episode: epLabel,
    slug: path,
    initialTime,
    prevEp: detail.prev ? epNumberOf(detail.prev.title) ?? "?" : null,
    nextEp: detail.next ? epNumberOf(detail.next.title) ?? "?" : null,
    prevHref: detail.prev ? `/hentai/${detail.prev.slug}` : null,
    nextHref: detail.next ? `/hentai/${detail.next.slug}` : null,
    streamApi: `/api/hentai-stream?slug=${encodeURIComponent(path)}`,
    streamIndex: stream?.index ?? null,
  };

  const info: { label: string; value: string }[] = [];
  if (detail.score) info.push({ label: "Rating", value: detail.score });
  if (detail.status) info.push({ label: "Status", value: detail.status });
  if (detail.aired) info.push({ label: "Tayang", value: detail.aired });
  if (detail.duration) info.push({ label: "Durasi", value: detail.duration });
  if (detail.date) info.push({ label: "Tanggal", value: detail.date });
  if (detail.producer) info.push({ label: "Producer", value: detail.producer });
  if (detail.size) info.push({ label: "Ukuran", value: detail.size });
  info.push({ label: "Tipe", value: "Video 18+" });
  if (detail.totalEpisodes) info.push({ label: "Episode", value: detail.totalEpisodes });
  else if (detail.episodes.length) info.push({ label: "Episode", value: String(detail.episodes.length) });
  if (isEpisode && detail.streams.length) {
    info.push({ label: "Server", value: detail.streams.map((s) => s.server).join(" · ") });
  }

  return (
    <>
      <p style={{ marginBottom: 12, fontSize: 14 }}>
        <Link href="/hentai" className="muted meta-item">
          <IconChevronLeft size={14} />
          Hentai
        </Link>
      </p>

      <article className="detail">
        <header className="detail-hero">
          <div className="detail-hero-backdrop" aria-hidden="true">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt="" width={880} height={496} />
            ) : null}
          </div>
          <div className="detail-hero-scrim" aria-hidden="true" />

          <div className={detail.poster ? "detail-hero-inner" : "detail-hero-inner is-wide"}>
            {detail.poster ? (
              <div className="detail-poster">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="detail-cover" src={detail.poster} alt="" width={440} height={660} />
              </div>
            ) : detail.thumb ? (
              <div className="detail-wide">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="detail-wide-cover" src={detail.thumb} alt="" width={880} height={496} />
              </div>
            ) : null}

            <div className="detail-info">
              <div className="detail-badges">
                <span className="chip">18+</span>
                <span className="chip">{isEpisode ? detail.label || `Ep ${epNo ?? "?"}` : "Seri"}</span>
              </div>

              <h1 className="detail-title">{detail.title}</h1>

              <div className="detail-meta">
                {detail.score ? <span>★ {detail.score}</span> : null}
                {detail.duration ? <span>{detail.duration}</span> : null}
                {detail.totalEpisodes || detail.episodes.length ? (
                  <span>Ep {detail.totalEpisodes || detail.episodes.length}</span>
                ) : null}
              </div>

              {detail.genres.length ? (
                <div className="detail-genres">
                  {detail.genres.map((g) => (
                    <Link key={g} href={`/hentai?q=${encodeURIComponent(g)}`} className="genre-chip">
                      {g}
                    </Link>
                  ))}
                </div>
              ) : null}

              {!isEpisode && latestEp ? (
                <div className="detail-actions">
                  <Link href={`/hentai/${latestEp.slug}`} className="btn-play">
                    <IconPlay size={14} />
                    Putar {latestEp.label || `Ep ${latestEp.ep ?? ""}`}
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className="detail-body">
          {isEpisode ? (
            <>
              {stream ? (
                <>
                  <HistoryTracker
                    slug={path}
                    title={detail.title}
                    ep={epLabel}
                    cover={cover}
                    src={stream.url}
                    kind="hentai"
                  />
                  <VideoPlayer {...playerProps} />
                </>
              ) : (
                <StreamBusy
                  player={playerProps}
                  history={{ slug: path, title: detail.title, ep: epLabel, cover }}
                />
              )}

              {detail.prev || detail.next || detail.series ? (
                <div className="detail-actions" style={{ marginTop: 16 }}>
                  {detail.prev ? (
                    <Link href={`/hentai/${detail.prev.slug}`} className="text-btn">
                      <IconChevronLeft size={14} />
                      Sebelumnya
                    </Link>
                  ) : null}
                  {detail.next ? (
                    <Link href={`/hentai/${detail.next.slug}`} className="btn-play">
                      Berikutnya
                      <IconChevronRight size={14} />
                    </Link>
                  ) : null}
                  {detail.series ? (
                    <Link href={`/hentai/${detail.series.slug}`} className="text-btn">
                      Daftar episode
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}

          {detail.synopsis ? (
            <section className="detail-block">
              <BlockHead>Sinopsis</BlockHead>
              <p className="detail-synopsis">{detail.synopsis}</p>
            </section>
          ) : null}

          {detail.episodes.length ? (
            <section className="detail-block">
              <BlockHead>Episode</BlockHead>
              <div className="ep-grid">
                {detail.episodes.map((e) => (
                  <Link
                    key={e.slug}
                    href={`/hentai/${e.slug}`}
                    className="ep-link"
                    aria-current={isEpisode && e.slug === path ? "page" : undefined}
                  >
                    {e.label || `Ep ${e.ep ?? ""}`}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {info.length ? (
            <section className="detail-block">
              <BlockHead>Info</BlockHead>
              <dl className="info-grid">
                {info.map((it) => (
                  <div className="info-item" key={it.label}>
                    <dt>{it.label}</dt>
                    <dd>{it.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
        </div>
      </article>
    </>
  );
}
