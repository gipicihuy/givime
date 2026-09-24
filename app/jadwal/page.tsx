import Link from "next/link";
import { AnimeGrid } from "@/components/AnimeCard";
import { IconSchedule } from "@/components/Icons";
import { getList, IDS } from "@/lib/api";

export const revalidate = 3600;
export const metadata = { title: "Jadwal" };

type SP = { day?: string };

const DAYS = [
  { key: "senin", label: "Senin" },
  { key: "selasa", label: "Selasa" },
  { key: "rabu", label: "Rabu" },
  { key: "kamis", label: "Kamis" },
  { key: "jumat", label: "Jumat" },
  { key: "sabtu", label: "Sabtu" },
  { key: "minggu", label: "Minggu" },
] as const;

function todayKey(): string {
  const map = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"];
  return map[new Date().getDay()] ?? "senin";
}

export default async function JadwalPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const today = todayKey();
  const day = DAYS.some((d) => d.key === sp.day) ? (sp.day as string) : today;
  const label = DAYS.find((d) => d.key === day)?.label ?? "Senin";
  const id = IDS.jadwal[day as keyof typeof IDS.jadwal];

  let r: Awaited<ReturnType<typeof getList>>;
  try {
    r = await getList(
      { jadwalrilis: id, orderby: "title", order: "asc", per_page: 50 },
      3600,
    );
  } catch {
    r = { items: [], total: 0, totalPages: 1 };
  }

  return (
    <>
      <h1 className="page-title">
        <span className="page-title-icon" aria-hidden>
          <IconSchedule size={22} />
        </span>
        Jadwal
      </h1>
      <p className="page-sub">Jadwal rilis anime · hari ini {label}</p>

      <div className="jadwal-days" role="tablist" aria-label="Pilih hari">
        {DAYS.map((d) => {
          const on = d.key === day;
          const isToday = d.key === today;
          return (
            <Link
              key={d.key}
              href={`/jadwal?day=${d.key}`}
              role="tab"
              aria-selected={on}
              className={on ? "jadwal-day is-on" : isToday ? "jadwal-day is-today" : "jadwal-day"}
            >
              {d.label}
              {isToday ? <span className="jadwal-dot" aria-hidden /> : null}
            </Link>
          );
        })}
      </div>

      <p className="page-sub">
        {r.total ?? r.items.length} judul · {label}
      </p>
      <AnimeGrid items={r.items} />
    </>
  );
}
