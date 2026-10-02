import Link from "next/link";
import { notFound } from "next/navigation";
import { DonghuaEpisodeList } from "@/components/Donghua";
import { DonghuaPlayer } from "@/components/DonghuaPlayer";
import { HistoryTracker } from "@/components/HistoryTracker";
import { IconChevronLeft, IconChevronRight } from "@/components/Icons";
import {
  fetchDonghuaDetail,
  fetchDonghuaEpisode,
  orderedServers,
  pickBestServer,
} from "@/lib/anichin";
import type { DonghuaEpisodeItem } from "@/lib/donghua";

export const dynamic = "force-dynamic";
export const metadata = { title: "Putar Donghua" };

type Params = { ep: string };

export default async function DonghuaWatchPage({ params }: { params: Promise<Params> }) {
  const { ep } = await params;

  let data: Awaited<ReturnType<typeof fetchDonghuaEpisode>> = null;
  try {
    data = await fetchDonghuaEpisode(ep);
  } catch {
    data = null;
  }
  if (!data) notFound();

  const servers = orderedServers(data.servers);
  let best = servers[0] ?? null;
  try {
    best = (await pickBestServer(data)) ?? best;
  } catch {
    /* fallback server pertama */
  }

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

  // Daftar urut terbaru → terlama: indeks lebih kecil = episode lebih baru.
  // Kalau episode ini gak ada di daftar, pakai prev/next hasil scrape halaman.
  const idx = episodes.findIndex((e) => e.slug === data.slug);
  const prevEp =
    idx >= 0
      ? episodes[idx + 1]
        ? { slug: episodes[idx + 1].slug, number: episodes[idx + 1].number }
        : null
      : data.prev
        ? { slug: data.prev.slug, number: null }
        : null;
  const nextEp =
    idx >= 0
      ? idx > 0
        ? { slug: episodes[idx - 1].slug, number: episodes[idx - 1].number }
        : null
      : data.next
        ? { slug: data.next.slug, number: null }
        : null;

  if (!servers.length) {
    return (
      <>
        <h1 className="page-title">{data.title}</h1>
        <div className="state">
          <strong>Server belum tersedia</strong>
          Episode ini lagi gak punya server yang bisa diputar.
          <Link href={detailSlug ? `/donghua/${detailSlug}` : "/donghua"} className="muted meta-item">
            Kembali
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <HistoryTracker
        kind="donghua"
        slug={detailSlug ?? data.slug}
        title={data.seriesTitle}
        ep={data.number ?? data.title}
        epSlug={data.slug}
        cover={data.cover ?? undefined}
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
          {servers.length > 1 ? ` · ${servers.length} server` : ""}
        </p>
        <nav className="dp-epnav" aria-label="Episode lain">
          {prevEp ? (
            <Link
              href={`/donghua/watch/${prevEp.slug}`}
              className="ep-sort-btn"
              aria-label={`Episode sebelumnya${prevEp.number ? ` (Ep ${prevEp.number})` : ""}`}
              title={prevEp.number ? `Ep ${prevEp.number}` : "Sebelumnya"}
            >
              <IconChevronLeft size={17} />
            </Link>
          ) : (
            <span className="ep-sort-btn is-off" aria-hidden>
              <IconChevronLeft size={17} />
            </span>
          )}
          {nextEp ? (
            <Link
              href={`/donghua/watch/${nextEp.slug}`}
              className="ep-sort-btn"
              aria-label={`Episode berikutnya${nextEp.number ? ` (Ep ${nextEp.number})` : ""}`}
              title={nextEp.number ? `Ep ${nextEp.number}` : "Berikutnya"}
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
        <DonghuaPlayer
          servers={servers}
          initial={best}
          title={data.seriesTitle}
          epLabel={epLabel}
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
    </>
  );
}
