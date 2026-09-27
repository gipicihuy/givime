import Link from "next/link";
import { Pager } from "@/components/Pager";
import { SearchBox } from "@/components/SearchBox";
import { type HentaiItem, fetchHentaiList, fetchHentaiSearch } from "@/lib/ryukomik";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hentai" };

type PageProps = { searchParams: Promise<{ q?: string; page?: string }> };

function HentaiCard({ item }: { item: HentaiItem }) {
  return (
    <Link className="hentai-card" href={`/hentai/${item.slug}`}>
      <span className="hentai-thumb" aria-hidden>
        {item.thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumb} alt="" loading="lazy" width={300} height={169} />
        ) : (
          <span className="hentai-thumb-ph">Tanpa still</span>
        )}
      </span>
      <span className="hentai-title">{item.title}</span>
      {item.ep != null || item.date ? (
        <span className="hentai-meta">{item.ep != null ? `EP ${item.ep}` : item.date}</span>
      ) : null}
    </Link>
  );
}

function HentaiGrid({ items }: { items: HentaiItem[] }) {
  if (!items.length) return null;
  return (
    <div className="hentai-grid">
      {items.map((it) => (
        <HentaiCard key={it.slug} item={it} />
      ))}
    </div>
  );
}

function HentaiSearch() {
  return (
    <SearchBox
      endpoint="/api/hentai-suggest"
      hrefBase="/hentai"
      itemBase="/hentai"
      showCover
      placeholder="Cari judul…"
      label="Cari video"
    />
  );
}

export default async function HentaiPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  if (q) {
    const results = await fetchHentaiSearch(q);
    return (
      <>
        <h1 className="page-title">Hentai</h1>
        <p className="page-sub">
          {results === null
            ? "Cari judul"
            : `${results.length} hasil untuk “${q}”`}
        </p>
        <HentaiSearch />
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
          <HentaiGrid items={results} />
        )}
      </>
    );
  }

  const page = Math.max(1, Number(sp.page) || 1);
  const data = await fetchHentaiList(page);

  return (
    <>
      <h1 className="page-title">Hentai</h1>
      <p className="page-sub">Video anime dewasa · 18+</p>
      <HentaiSearch />

      {!data ? (
        <div className="state" style={{ marginTop: 24 }}>
          <strong>Lagi gangguan nih</strong>
          Daftar video belum bisa diambil. Coba lagi beberapa saat.
        </div>
      ) : data.items.length === 0 ? (
        <div className="state" style={{ marginTop: 24 }}>
          <strong>Kosong</strong>
          Belum ada judul yang bisa ditampilkan di halaman ini.
        </div>
      ) : (
        <>
          <div style={{ marginTop: 20 }}>
            <HentaiGrid items={data.items} />
          </div>
          <Pager page={page} totalPages={data.totalPages} basePath="/hentai" />
        </>
      )}
    </>
  );
}
