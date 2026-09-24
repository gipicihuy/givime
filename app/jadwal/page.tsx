import Link from "next/link";
import {
  IconChevronLeft,
  IconChevronRight,
  IconSchedule,
  IconStar,
} from "@/components/Icons";
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

function dayIndex(key: string): number {
  const i = DOW.indexOf(key as (typeof DOW)[number]);
  return i >= 0 ? i : 0;
}

function neighborDay(key: string, delta: -1 | 1): { key: string; label: string } {
  const i = dayIndex(key);
  const n = (i + delta + DOW.length) % DOW.length;
  return { key: DOW[n], label: LONG[n] };
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
 * Warna indikator dari data nyata (tanpa label teks karangan):
 * - completed, merah
 * - punya label episode valid, lime
 * - else, abu
 * Views & jam presisi: API tidak punya, tidak dirender.
 */
function jadwalTone(a: Anime): "aired" | "wait" | "late" {
  const s = (metaOf(a).ero_status || "").trim().toLowerCase();
  const ids = a.animestatus ?? [];
  const done =
    s === "completed" ||
    (ids.includes(IDS.status.completed) && !ids.includes(IDS.status.ongoing));
  if (done) return "late";
  if (episodeLabel(a)) return "aired";
  return "wait";
}

function scoreOf(a: Anime): number {
  const n = Number(metaOf(a).ero_skor || 0);
  return Number.isFinite(n) ? n : 0;
}

function byScoreThenTitle(items: Anime[]): Anime[] {
  return [...items].sort(
    (a, b) => scoreOf(b) - scoreOf(a) || titleOf(a).localeCompare(titleOf(b)),
  );
}

export default async function JadwalPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const today = todayKey();
  const day = DOW.includes(sp.day as (typeof DOW)[number]) ? (sp.day as string) : today;
  const label = LONG[dayIndex(day)] ?? "Senin";
  const id = IDS.jadwal[day as keyof typeof IDS.jadwal];
  const strip = stripDays(day);
  const prev = neighborDay(day, -1);
  const next = neighborDay(day, 1);

  let r: Awaited<ReturnType<typeof getList>>;
  try {
    r = await getList(
      { jadwalrilis: id, orderby: "title", order: "asc", per_page: 50 },
      3600,
    );
  } catch {
    r = { items: [], total: 0, totalPages: 1 };
  }

  const items = byScoreThenTitle(r.items);

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
        {items.length} judul · {label}
      </p>

      {items.length ? (
        <ul className="jadwal-list">
          {items.map((a) => {
            const ep = episodeLabel(a);
            const score = metaOf(a).ero_skor;
            const cover = metaOf(a).ero_image;
            const tone = jadwalTone(a);
            return (
              <li key={`${a.id}-${a.slug}`}>
                <Link href={`/anime/${a.slug}`} className={`jadwal-item is-${tone}`}>
                  <span className="jadwal-thumb" aria-hidden>
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt="" loading="lazy" width={72} height={108} />
                    ) : null}
                  </span>
                  <span className="jadwal-body">
                    <span className="jadwal-title">{titleOf(a)}</span>
                    {ep ? <span className="jadwal-ep">Episode {ep}</span> : null}
                    {score ? (
                      <span className="jadwal-meta">
                        <span className="jadwal-meta-item">
                          <IconStar size={12} />
                          {score}
                        </span>
                      </span>
                    ) : null}
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

      <nav className="jadwal-daynav" aria-label="Pindah hari">
        <Link href={`/jadwal?day=${prev.key}`} className="jadwal-daynav-link">
          <span className="pager-arrow" aria-hidden>
            <IconChevronLeft size={16} />
          </span>
          <span>{prev.label}</span>
        </Link>
        <Link href={`/jadwal?day=${next.key}`} className="jadwal-daynav-link is-next">
          <span>{next.label}</span>
          <span className="pager-arrow" aria-hidden>
            <IconChevronRight size={16} />
          </span>
        </Link>
      </nav>
    </>
  );
}
