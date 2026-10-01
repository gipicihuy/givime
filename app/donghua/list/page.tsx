import { StepPager } from "@/components/Pager";
import { SectionOrnament } from "@/components/Shelf";
import { DonghuaGrid } from "@/components/Donghua";
import { fetchDonghuaCatalog } from "@/lib/anichin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Donghua List" };

type SP = { page?: string };

export default async function DonghuaListPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  let data: Awaited<ReturnType<typeof fetchDonghuaCatalog>> | null = null;
  try {
    data = await fetchDonghuaCatalog(page);
  } catch {
    data = null;
  }

  return (
    <>
      <h1 className="page-title">
        <span className="section-ornament" aria-hidden>
          <SectionOrnament />
        </span>
        {data?.title ?? "Donghua List"}
      </h1>
      <p className="page-sub">Katalog donghua · halaman {page}</p>

      {!data ? (
        <div className="state" style={{ marginTop: 24 }}>
          <strong>Lagi gangguan nih</strong>
          Katalog belum bisa diambil. Coba lagi beberapa saat.
        </div>
      ) : data.items.length === 0 ? (
        <div className="state" style={{ marginTop: 24 }}>
          <strong>Kosong</strong>
          Halaman ini lagi gak ada isinya.
        </div>
      ) : (
        <>
          <div style={{ marginTop: 16 }}>
            <DonghuaGrid items={data.items} />
          </div>
          <StepPager
            page={page}
            hasPrev={data.hasPrev}
            hasNext={data.hasNext}
            basePath="/donghua/list"
          />
        </>
      )}
    </>
  );
}
