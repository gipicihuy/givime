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
  titlesLikelySame,
  titleMatchKey,
  titleOf,
  type Anime,
} from "@/lib/api";
import malSchedule from "@/lib/mal-schedule.json";

export const revalidate = 3600;
export const metadata = { title: "Jadwal" };

type SP = { day?: string };

type MalItem = {
  malId: number;
  title: string;
  score: string;
  eps: string;
  cover: string;
};

type JadwalRow =
  | { kind: "local"; key: string; a: Anime }
  | { kind: "mal"; key: string; m: MalItem };

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

/** Gabung katalog lokal + jadwal MAL; judul sama (toleran season) = 1, menang lokal. */
function mergeJadwal(items: Anime[], mal: MalItem[]): JadwalRow[] {
  const localTitles = items.map((a) => titleOf(a));
  const rows: JadwalRow[] = items.map((a) => ({
    kind: "local",
    key: `l-${a.id}-${a.slug}`,
    a,
  }));

  for (const m of mal) {
    if (localTitles.some((ln) => titlesLikelySame(ln, m.title))) continue;
    rows.push({ kind: "mal", key: `m-${m.malId}`, m });
  }

  const label = (r: JadwalRow) => (r.kind === "local" ? titleOf(r.a) : r.m.title);
  return rows.sort((x, y) => label(x).localeCompare(label(y)));
}

function malForDay(day: string): MalItem[] {
  const bag = malSchedule as Record<string, MalItem[]>;
  return bag[day] ?? [];
}

/** Query search yang lebih ramah format season ("X 2nd Season" -> "X Season 2" / base). */
function titleBaseSearch(title: string): string {
  const k = titleMatchKey(title);
  return k || title;
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

  const rows = mergeJadwal(r.items, malForDay(day));

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
        {rows.length} judul · {label}
      </p>

      {rows.length ? (
        <ul className="jadwal-list">
          {rows.map((row) =>
            row.kind === "local" ? (
              <li key={row.key}>
                <Link
                  href={`/anime/${row.a.slug}`}
                  className={`jadwal-item is-${jadwalTone(row.a)}`}
                >
                  <span className="jadwal-thumb" aria-hidden>
                    {metaOf(row.a).ero_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={metaOf(row.a).ero_image}
                        alt=""
                        loading="lazy"
                        width={72}
                        height={108}
                      />
                    ) : null}
                  </span>
                  <span className="jadwal-body">
                    <span className="jadwal-title">{titleOf(row.a)}</span>
                    {episodeLabel(row.a) ? (
                      <span className="jadwal-ep">Episode {episodeLabel(row.a)}</span>
                    ) : null}
                    {metaOf(row.a).ero_skor ? (
                      <span className="jadwal-meta">
                        <span className="jadwal-meta-item">
                          <IconStar size={12} />
                          {metaOf(row.a).ero_skor}
                        </span>
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            ) : (
              <li key={row.key}>
                <Link
                  href={`/search?q=${encodeURIComponent(titleBaseSearch(row.m.title))}`}
                  className="jadwal-item is-wait"
                >
                  <span className="jadwal-thumb" aria-hidden>
                    {row.m.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.m.cover}
                        alt=""
                        loading="lazy"
                        width={72}
                        height={108}
                      />
                    ) : null}
                  </span>
                  <span className="jadwal-body">
                    <span className="jadwal-title">{row.m.title}</span>
                    {row.m.score ? (
                      <span className="jadwal-meta">
                        <span className="jadwal-meta-item">
                          <IconStar size={12} />
                          {row.m.score}
                        </span>
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            ),
          )}
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
