import Link from "next/link";
import { IconSchedule, IconStar } from "@/components/Icons";
import {
  IDS,
  getList,
  episodeLabel,
  metaOf,
  titleOf,
  type Anime,
} from "@/lib/api";

export const revalidate = 3600;
export const metadata = { title: "Jadwal" };

type SP = { day?: string };

const DOW = [
  "minggu",
  "senin",
  "selasa",
  "rabu",
  "kamis",
  "jumat",
  "sabtu",
] as const;
const SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"] as const;
const LONG = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
] as const;

function todayKey(): string {
  return DOW[new Date().getDay()] ?? "senin";
}

/** Minggu Sun-Sat yang memuat hari aktif (pakai minggu kalender hari ini). */
function stripDays(activeKey: string) {
  const now = new Date();
  const todayIdx = now.getDay();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - todayIdx);

  return DOW.map((key, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return {
      key,
      short: SHORT[i],
      long: LONG[i],
      date: d.getDate(),
      isActive: key === activeKey,
      isToday: key === todayKey(),
    };
  });
}

/**
 * Status list dari data yang ada:
 * - completed, merah "Tamat"
 * - punya label episode valid, lime "Sudah Tayang"
 * - else, abu "Menunggu Update Baru"
 * Views & jam presisi: API tidak punya, tidak dirender.
 */
function jadwalStatus(a: Anime): { tone: "aired" | "wait" | "late"; label: string } {
  const s = (metaOf(a).ero_status || "").trim().toLowerCase();
  const ids = a.animestatus ?? [];
  const done =
    s === "completed" ||
    (ids.includes(IDS.status.completed) && !ids.includes(IDS.status.ongoing));
  if (done) return { tone: "late", label: "Tamat" };
  if (episodeLabel(a)) return { tone: "aired", label: "Sudah Tayang" };
  return { tone: "wait", label: "Menunggu Update Baru" };
}

export default async function JadwalPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const today = todayKey();
  const day = DOW.includes(sp.day as (typeof DOW)[number]) ? (sp.day as string) : today;
  const label = LONG[DOW.indexOf(day as (typeof DOW)[number])] ?? "Senin";
  const id = IDS.jadwal[day as keyof typeof IDS.jadwal];
  const strip = stripDays(day);

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
      <p className="page-sub">Jadwal rilis · {label}</p>

      <div className="jadwal-strip" role="tablist" aria-label="Pilih hari">
        {strip.map((d) => (
          <Link
            key={d.key}
            href={`/jadwal?day=${d.key}`}
            role="tab"
            aria-selected={d.isActive}
            aria-label={`${d.long} ${d.date}`}
            className="jadwal-col"
          >
            <span className="jadwal-dow">{d.short}</span>
            <span className={d.isActive ? "jadwal-num is-active" : "jadwal-num"}>
              {d.date}
            </span>
            <span
              className={d.isToday ? "jadwal-today-dot is-on" : "jadwal-today-dot"}
              aria-hidden
            />
          </Link>
        ))}
      </div>

      <p className="page-sub">
        {r.total ?? r.items.length} judul · {label}
      </p>

      {r.items.length ? (
        <ul className="jadwal-list">
          {r.items.map((a) => {
            const st = jadwalStatus(a);
            const ep = episodeLabel(a);
            const score = metaOf(a).ero_skor;
            const cover = metaOf(a).ero_image;
            return (
              <li key={`${a.id}-${a.slug}`}>
                <Link
                  href={`/anime/${a.slug}`}
                  className={`jadwal-item is-${st.tone}`}
                >
                  <span className="jadwal-thumb" aria-hidden>
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt="" loading="lazy" width={72} height={108} />
                    ) : null}
                  </span>
                  <span className="jadwal-body">
                    <span className="jadwal-title">{titleOf(a)}</span>
                    <span className="jadwal-ep">
                      {ep ? `Episode ${ep}` : "Episode —"}
                    </span>
                    {score ? (
                      <span className="jadwal-meta">
                        <span className="jadwal-meta-item">
                          <IconStar size={12} />
                          {score}
                        </span>
                      </span>
                    ) : null}
                    <span className="jadwal-status">
                      <span className="jadwal-status-dot" aria-hidden />
                      {st.label}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="state">
          <strong>Belum ada jadwal</strong>
          Tidak ada judul untuk hari {label}.
        </div>
      )}
    </>
  );
}
