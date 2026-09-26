import Link from "next/link";
import { IconChevronLeft, IconChevronRight } from "@/components/Icons";
import { chapterSlugOf, fetchKomikReader } from "@/lib/komikindo";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string; ch: string }> };

export async function generateMetadata({ params }: Params) {
  const { slug, ch } = await params;
  const r = await fetchKomikReader(slug, decodeURIComponent(ch));
  return { title: r?.title ?? "Baca Komik" };
}

export default async function KomikReaderPage({ params }: Params) {
  const { slug, ch } = await params;
  const r = await fetchKomikReader(slug, decodeURIComponent(ch));

  if (!r) {
    return (
      <>
        <h1 className="page-title">Baca Komik</h1>
        <div className="state" style={{ marginTop: 24 }}>
          <strong>Chapter gagal diambil</strong>
          Halaman chapter ini lagi gagal dimuat.{" "}
          <Link href={`/komik/${slug}`} className="muted meta-item">
            <IconChevronLeft size={14} />
            Kembali ke daftar chapter
          </Link>
        </div>
      </>
    );
  }

  const chHref = (href: string) =>
    `/komik/${slug}/baca/${encodeURIComponent(chapterSlugOf(href))}`;

  const pager = (
    <div className="chapter-pager">
      {r.prev ? (
        <Link href={chHref(r.prev.href)}>
          <IconChevronLeft size={15} />
          Chapter {r.prev.label}
        </Link>
      ) : (
        <span className="is-off">
          <IconChevronLeft size={15} />
          Awal
        </span>
      )}
      {r.next ? (
        <Link href={chHref(r.next.href)} className="is-next">
          Chapter {r.next.label}
          <IconChevronRight size={15} />
        </Link>
      ) : (
        <span className="is-off is-next">
          Terbaru
          <IconChevronRight size={15} />
        </span>
      )}
    </div>
  );

  return (
    <>
      <p style={{ marginBottom: 4, fontSize: 14 }}>
        <Link href={`/komik/${slug}`} className="muted meta-item">
          <IconChevronLeft size={14} />
          Kembali
        </Link>
      </p>

      <h1 className="page-title chapter-title">{r.title}</h1>

      {pager}

      <div className="chapter-images">
        {r.images.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${i}-${src.slice(-24)}`}
            src={src}
            alt={`Halaman ${i + 1}`}
            loading={i < 2 ? "eager" : "lazy"}
            referrerPolicy="no-referrer"
          />
        ))}
      </div>

      {pager}
    </>
  );
}
