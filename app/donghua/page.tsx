import Link from "next/link";
import { IconChevronRight } from "@/components/Icons";
import { SearchBox } from "@/components/SearchBox";
import { SectionOrnament } from "@/components/Shelf";
import { DonghuaGrid, DonghuaShelf } from "@/components/Donghua";
import { fetchDonghuaHome, fetchDonghuaSearch } from "@/lib/anichin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Donghua" };

type SP = { q?: string };

function DonghuaSearch() {
  return (
    <SearchBox
      endpoint="/api/donghua-suggest"
      hrefBase="/donghua"
      itemBase="/donghua"
      showCover
      placeholder="Cari judul donghua…"
      label="Cari donghua"
    />
  );
}

export default async function DonghuaPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  if (q) {
    const results = await fetchDonghuaSearch(q);
    return (
      <>
        <h1 className="page-title">
          <span className="section-ornament" aria-hidden>
            <SectionOrnament />
          </span>
          Donghua
        </h1>
        <p className="page-sub">
          {results === null ? "Cari judul" : `${results.length} hasil untuk “${q}”`}
        </p>
        <DonghuaSearch />
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
          <div style={{ marginTop: 20 }}>
            <DonghuaGrid items={results} />
          </div>
        )}
      </>
    );
  }

  let home: Awaited<ReturnType<typeof fetchDonghuaHome>> | null = null;
  try {
    home = await fetchDonghuaHome();
  } catch {
    home = null;
  }

  const sections = home?.sections ?? [];
  const genres = (home?.genres ?? []).slice(0, 24);

  return (
    <>
      <h1 className="page-title">
        <span className="section-ornament" aria-hidden>
          <SectionOrnament />
        </span>
        Donghua
      </h1>
      <p className="page-sub">Donghua Sub Indo terbaru · section ngikut anichin.moe</p>
      <DonghuaSearch />

      {!home ? (
        <div className="state" style={{ marginTop: 24 }}>
          <strong>Lagi gangguan nih</strong>
          Daftar donghua belum bisa diambil. Coba lagi beberapa saat.
        </div>
      ) : sections.length === 0 ? (
        <div className="state" style={{ marginTop: 24 }}>
          <strong>Kosong</strong>
          Belum ada judul yang bisa ditampilkan di halaman ini.
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          {sections.map((s) => (
            <DonghuaShelf
              key={s.key}
              title={s.title}
              items={s.items}
              href={s.key === "rilisan-terbaru" ? "/donghua/list" : undefined}
            />
          ))}
        </div>
      )}

      {genres.length ? (
        <section className="section">
          <div className="section-head">
            <h2 className="section-title">
              <span className="section-ornament" aria-hidden>
                <SectionOrnament />
              </span>
              Genre
            </h2>
            <Link href="/donghua/list" className="section-more">
              Donghua List
              <IconChevronRight size={14} />
            </Link>
          </div>
          <div className="genre-list">
            {genres.map((g) => (
              <Link key={g.slug} href={`/donghua/genre/${g.slug}`} className="genre-tag">
                {g.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
