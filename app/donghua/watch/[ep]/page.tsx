import Link from "next/link";
import { notFound } from "next/navigation";
import { DonghuaEpisodeList } from "@/components/Donghua";
import { VideoPlayer } from "@/components/Episode";
import { HistoryTracker } from "@/components/HistoryTracker";
import { IconChevronLeft, IconChevronRight } from "@/components/Icons";
import { fetchDonghuaDetail, fetchDonghuaEpisode } from "@/lib/dongha";
import type { DonghuaEpisodeItem } from "@/lib/donghua";

export const dynamic = "force-dynamic";
export const metadata = { title: "Putar Donghua" };

type Params = { ep: string };
type SP = { t?: string };

const navNum = (label?: string | null) => label?.replace(/^Ep\s*/i, "") ?? null;

export default async function DonghuaWatchPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SP>;
}) {
  const { ep } = await params;
  const sp = await searchParams;

  let data: Awaited<ReturnType<typeof fetchDonghuaEpisode>> = null;
  try {
    data = await fetchDonghuaEpisode(ep);
  } catch {
    data = null;
  }
  if (!data) notFound();

  const detailSlug = data.detailSlug;

  // Daftar episode seri (detail di-cache, jadi murah) buat grid di bawah player.
  let episodes: DonghuaEpisodeItem[] = [];
  if (detailSlug) {
    try {
      episodes = (await fetchDonghuaDetail(detailSlug))?.episodes ?? [];
    } catch {
      episodes = [];
    }
  }

  const epLabel = data.number ? `Ep ${data.number}` : "Episode";
  const initialTime = Math.max(0, Number(sp.t) || 0);

  if (!data.videos.length) {
    return (
      <>
        <h1 className="page-title">{data.seriesTitle}</h1>
        <div className="state">
          <strong>Video belum tersedia</strong>
          Episode ini belum punya file yang bisa diputar.
          <Link
            href={detailSlug ? `/donghua/${detailSlug}` : "/donghua"}
            className="muted meta-item"
          >
            Kembali
          </Link>
        </div>
      </>
    );
  }

  const best = data.videos[0];
  const qualities = data.videos.map((v) => ({
    label: [v.quality || "Auto", v.isDubbed ? "Dub" : null].filter(Boolean).join(" · "),
    src: v.url,
  }));

  const defaultSubtitle =
    data.subtitles.find((s) => s.language === "id") ??
    data.subtitles.find((s) => s.isDefault) ??
    data.subtitles[0];
  const tracks = data.subtitles.map((s) => ({
    src: s.url,
    label: s.label,
    lang: (s.language || "und").slice(0, 2),
    default: s.id === defaultSubtitle?.id,
  }));

  return (
    <>
      <HistoryTracker
        kind="donghua"
        slug={detailSlug ?? data.slug}
        title={data.seriesTitle}
        ep={data.number ?? data.title}
        epSlug={data.slug}
        cover={data.cover ?? undefined}
        src={best.url}
        t={initialTime || undefined}
      />

      <p style={{ marginBottom: 12, fontSize: 14 }}>
        <Link
          href={detailSlug ? `/donghua/${detailSlug}` : "/donghua"}
          className="muted meta-item"
        >
          <IconChevronLeft size={14} />
          Kembali
        </Link>
      </p>

      <h1 className="page-title">{data.seriesTitle}</h1>

      <div className="dp-epbar">
        <p className="dp-epbar-label">
          {epLabel}
          {data.videos.length > 1 ? ` · ${data.videos.length} kualitas` : ""}
          {data.subtitles.length ? ` · ${data.subtitles.length} subtitle` : ""}
        </p>
        <nav className="dp-epnav" aria-label="Episode lain">
          {data.prev ? (
            <Link
              href={`/donghua/watch/${data.prev.slug}`}
              className="ep-sort-btn"
              aria-label={`Episode sebelumnya${data.prev.label ? ` (${data.prev.label})` : ""}`}
              title={data.prev.label || "Sebelumnya"}
            >
              <IconChevronLeft size={17} />
            </Link>
          ) : (
            <span className="ep-sort-btn is-off" aria-hidden>
              <IconChevronLeft size={17} />
            </span>
          )}
          {data.next ? (
            <Link
              href={`/donghua/watch/${data.next.slug}`}
              className="ep-sort-btn"
              aria-label={`Episode berikutnya${data.next.label ? ` (${data.next.label})` : ""}`}
              title={data.next.label || "Berikutnya"}
            >
              <IconChevronRight size={17} />
            </Link>
          ) : (
            <span className="ep-sort-btn is-off" aria-hidden>
              <IconChevronRight size={17} />
            </span>
          )}
        </nav>
      </div>

      <div style={{ marginTop: 16 }}>
        <VideoPlayer
          src={best.url}
          animeTitle={data.seriesTitle}
          episode={data.number ?? "?"}
          slug={detailSlug ?? data.slug}
          epSlug={data.slug}
          initialTime={initialTime}
          prevEp={navNum(data.prev?.label)}
          nextEp={navNum(data.next?.label)}
          prevHref={data.prev ? `/donghua/watch/${data.prev.slug}` : null}
          nextHref={data.next ? `/donghua/watch/${data.next.slug}` : null}
          tracks={tracks}
          qualities={qualities}
        />
      </div>

      {episodes.length ? (
        <section className="section">
          <DonghuaEpisodeList
            episodes={episodes}
            current={data.number}
            currentSlug={data.slug}
          />
        </section>
      ) : null}

      {data.synopsis ? (
        <section className="section">
          <div className="section-head">
            <h2 className="section-title">Sinopsis</h2>
          </div>
          <p className="detail-synopsis">{data.synopsis}</p>
        </section>
      ) : null}
    </>
  );
}
