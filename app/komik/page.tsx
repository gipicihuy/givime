import Link from "next/link";
import { SearchBox } from "@/components/SearchBox";
import { SectionOrnament } from "@/components/Shelf";
import { type KomikHome, type KomikItem, fetchKomikHome, fetchKomikSearch } from "@/lib/komikindo";

export const metadata = { title: "Komik" };
export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ q?: string }> };

function KomikPoster({ k }: { k: KomikItem }) {
  return (
    <Link className="poster" href={`/komik/${k.slug}`}>
      <div className="poster-thumb">
        {k.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="poster-cover" src={k.image} alt="" loading="lazy" width={300} height={450} />
        ) : (
          <div className="poster-placeholder">Tanpa cover</div>
        )}
        <span className="poster-fade" aria-hidden />
        {k.type ? <span className="poster-score">{k.type}</span> : null}
        {k.chapter ? <span className="poster-ep">{k.chapter}</span> : null}
      </div>
      <span className="poster-title">{k.title}</span>
      {k.rating ? (
        <div className="poster-meta">
          <span className="meta-item">★ {k.rating}</span>
        </div>
      ) : null}
    </Link>
  );
}

function KomikSection({ title, items }: { title: string; items: KomikItem[] }) {
  if (!items.length) return null;
  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-title">
          <span className="section-ornament" aria-hidden>
            <SectionOrnament />
          </span>
          {title}
        </h2>
      </div>
      <div className="poster-grid">
        {items.map((k) => (
          <KomikPoster key={k.slug} k={k} />
        ))}
      </div>
    </section>
  );
}

function KomikSearch() {
  return (
    <SearchBox
      endpoint="/api/komik-suggest"
      hrefBase="/komik"
      placeholder="Cari judul komik…"
      label="Cari komik"
    />
  );
}

export default async function KomikPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  if (q) {
    const results = await fetchKomikSearch(q);
    return (
      <>
        <h1 className="page-title">Komik</h1>
        <p className="page-sub">
          {results === null
            ? "Cari judul komik"
            : `${results.length} hasil untuk “${q}”`}
        </p>
        <KomikSearch />
        {results === null ? (
          <div className="state" style={{ marginTop: 24 }}>
            <strong>Lagi gangguan nih</strong>
            Pencarian belum bisa diambil. Coba lagi beberapa saat.
          </div>
        ) : results.length === 0 ? (
          <div className="state" style={{ marginTop: 24 }}>
            <strong>Tidak ada hasil</strong>
            Coba kata kunci lain, atau cek ejaan judulnya.
          </div>
        ) : (
          <KomikSection title="Hasil" items={results} />
        )}
      </>
    );
  }

  const data: KomikHome | null = await fetchKomikHome();

  return (
    <>
      <h1 className="page-title">Komik</h1>
      <p className="page-sub">Manga · Manhwa · Manhua — populer & terbaru</p>
      <KomikSearch />

      {!data ? (
        <div className="state" style={{ marginTop: 24 }}>
          <strong>Lagi gangguan nih</strong>
          Daftar komik belum bisa diambil. Coba lagi beberapa saat.
        </div>
      ) : (
        <>
          <KomikSection title="Populer Hari Ini" items={data.popular} />
          <KomikSection title="Terbaru" items={data.latest} />
          {!data.popular.length && !data.latest.length ? (
            <div className="state" style={{ marginTop: 24 }}>
              <strong>Kosong</strong>
              Belum ada judul yang bisa ditampilkan.
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
