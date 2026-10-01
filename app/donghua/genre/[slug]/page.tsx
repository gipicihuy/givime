import { notFound } from "next/navigation";
import { Pager } from "@/components/Pager";
import { SectionOrnament } from "@/components/Shelf";
import { DonghuaGrid } from "@/components/Donghua";
import { fetchDonghuaGenre } from "@/lib/anichin";

export const dynamic = "force-dynamic";

type Params = { slug: string };
type SP = { page?: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  return { title: `Genre ${slug.replace(/-/g, " ")}` };
}

export default async function DonghuaGenrePage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SP>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  let data: Awaited<ReturnType<typeof fetchDonghuaGenre>> = null;
  try {
    data = await fetchDonghuaGenre(slug, page);
  } catch {
    data = null;
  }
  if (!data || (!data.items.length && page <= 1)) notFound();

  return (
    <>
      <h1 className="page-title">
        <span className="section-ornament" aria-hidden>
          <SectionOrnament />
        </span>
        {data.title ?? slug.replace(/-/g, " ")}
      </h1>
      <p className="page-sub">Donghua genre {slug.replace(/-/g, " ")} · halaman {page}</p>

      {data.items.length === 0 ? (
        <div className="state" style={{ marginTop: 24 }}>
          <strong>Kosong</strong>
          Halaman ini lagi gak ada isinya. Coba halaman lain.
        </div>
      ) : (
        <>
          <div style={{ marginTop: 16 }}>
            <DonghuaGrid items={data.items} />
          </div>
          <Pager
            page={page}
            totalPages={data.totalPages ?? page}
            basePath={`/donghua/genre/${slug}`}
          />
        </>
      )}
    </>
  );
}
