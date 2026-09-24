import { AnimeGrid } from "@/components/AnimeCard";
import { Pager } from "@/components/Pager";
import { getList, IDS, isOngoingAnime } from "@/lib/api";

export const revalidate = 300;
export const metadata = { title: "Ongoing" };

type SP = { page?: string };

export default async function OngoingPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  let r: Awaited<ReturnType<typeof getList>>;
  try {
    r = await getList(
      {
        animestatus: IDS.status.ongoing,
        orderby: "modified",
        order: "desc",
        per_page: 24,
        page,
      },
      300,
    );
  } catch {
    r = { items: [], total: 0, totalPages: 1 };
  }

  const items = r.items.filter(isOngoingAnime);

  return (
    <>
      <h1 className="page-title">Ongoing</h1>
      <p className="page-sub">{r.total ?? items.length} judul · halaman {page}</p>
      <AnimeGrid items={items} />
      <Pager page={page} totalPages={r.totalPages ?? 1} basePath="/ongoing" />
    </>
  );
}
