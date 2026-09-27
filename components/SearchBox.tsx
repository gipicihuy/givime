"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { IconSearch } from "@/components/Icons";

type SuggestRow = { slug: string; title: string; cover?: string | null; sub: string };

type RawSuggest = {
  slug: string;
  title: string;
  cover?: string | null;
  meta?: string;
  totalEps?: number | string;
  status?: string;
  score?: string | number;
};

function toRow(it: RawSuggest): SuggestRow {
  const sub =
    it.meta ??
    [it.totalEps ? `${it.totalEps} Eps` : it.status || "-", it.score ? `★ ${it.score}` : ""]
      .filter(Boolean)
      .join(" · ");
  return { slug: it.slug, title: it.title, cover: it.cover, sub };
}

function SearchForm({
  endpoint,
  hrefBase,
  itemBase,
  showCover,
  placeholder,
  label,
}: {
  endpoint: string;
  hrefBase: string;
  itemBase: string;
  showCover: boolean;
  placeholder: string;
  label: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [items, setItems] = useState<SuggestRow[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Sinkron dari URL (back/forward, navigasi luar) — kalau input lagi fokus,
  // biarin state lokal menang (live search lagi jalan).
  useEffect(() => {
    const v = params.get("q") ?? "";
    setActive(-1);
    if (document.activeElement !== inputRef.current) setQ(v);
  }, [params]);

  // Live search: ketik → debounce → push (tanpa Enter).
  useEffect(() => {
    const t = q.trim();
    const cur = params.get("q") ?? "";
    if (t.length < 2) {
      if (!t && cur) {
        const id = setTimeout(() => {
          router.push(hrefBase);
        }, 350);
        return () => clearTimeout(id);
      }
      return;
    }
    if (t === cur) return;
    const id = setTimeout(() => {
      router.push(`${hrefBase}?q=${encodeURIComponent(t)}`);
    }, 450);
    return () => clearTimeout(id);
  }, [q, params, router, hrefBase]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setActive(-1);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const fetchSuggest = useCallback(
    (term: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();

      if (term.trim().length < 2) {
        setItems([]);
        setOpen(false);
        setActive(-1);
        setLoading(false);
        return;
      }

      setLoading(true);
      timerRef.current = setTimeout(async () => {
        const ac = new AbortController();
        abortRef.current = ac;
        try {
          const res = await fetch(`${endpoint}?q=${encodeURIComponent(term)}`, {
            signal: ac.signal,
          });
          if (!res.ok) throw new Error("suggest failed");
          const data = (await res.json()) as { items: RawSuggest[] };
          setItems(data.items.map(toRow));
          setOpen(true);
          setActive(-1);
        } catch {
          if (ac.signal.aborted) return;
          setItems([]);
          setOpen(false);
        } finally {
          if (!ac.signal.aborted) setLoading(false);
        }
      }, 280);
    },
    [endpoint],
  );

  function onChange(value: string) {
    setQ(value);
    fetchSuggest(value);
  }

  function onClear() {
    setQ("");
    setItems([]);
    setOpen(false);
    setActive(-1);
    inputRef.current?.focus();
    if (params.get("q")) router.push(hrefBase);
  }

  function goSearch(term: string) {
    const t = term.trim();
    if (!t) return;
    setOpen(false);
    setActive(-1);
    if (t === (params.get("q") ?? "")) return;
    router.push(`${hrefBase}?q=${encodeURIComponent(t)}`);
  }

  function goAnime(slug: string) {
    setOpen(false);
    setActive(-1);
    router.push(`${itemBase}/${slug}`);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (active >= 0 && items[active]) {
      goAnime(items[active].slug);
      return;
    }
    goSearch(q);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  const showList = open && (loading || items.length > 0);

  return (
    <div className="search-wrap" ref={boxRef}>
      <form className="search-form" role="search" onSubmit={onSubmit}>
        <label htmlFor="q" className="sr-only">
          {label}
        </label>
        <span className="search-icon" aria-hidden>
          <IconSearch size={16} />
        </span>
        <input
          id="q"
          ref={inputRef}
          className="search-input"
          type="search"
          name="q"
          placeholder={placeholder}
          value={q}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (items.length > 0) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={showList}
          aria-controls="search-suggest"
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `suggest-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
        />
        {q ? (
          <button type="button" className="search-clear" aria-label="Hapus pencarian" onClick={onClear}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        ) : null}
      </form>

      {showList ? (
        <div className="search-suggest" id="search-suggest" role="listbox" aria-label="Saran pencarian">
          {loading && items.length > 0 && (
            <div className="suggest-busy">
              <span className="suggest-spin" aria-hidden />
              Mencari…
            </div>
          )}
          {loading && items.length === 0 ? (
            <div className="suggest-empty">
              <span className="suggest-spin" aria-hidden />
              Mencari…
            </div>
          ) : items.length === 0 ? (
            <div className="suggest-empty">Tidak ada saran</div>
          ) : (
            items.map((item, i) => (
              <button
                key={item.slug}
                type="button"
                id={`suggest-${i}`}
                role="option"
                aria-selected={i === active}
                className={`suggest-item${i === active ? " is-active" : ""}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => goAnime(item.slug)}
              >
                {showCover ? (
                  item.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="suggest-thumb" src={item.cover} alt="" loading="lazy" width={36} height={54} />
                  ) : (
                    <span className="suggest-thumb suggest-thumb-ph" aria-hidden />
                  )
                ) : null}
                <span className="suggest-body">
                  <span className="suggest-title">{item.title}</span>
                  <span className="suggest-meta">{item.sub}</span>
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

export function SearchBox({
  endpoint = "/api/suggest",
  hrefBase = "/search",
  itemBase = "/anime",
  showCover = true,
  placeholder = "Cari judul anime…",
  label = "Cari anime",
}: {
  endpoint?: string;
  hrefBase?: string;
  itemBase?: string;
  showCover?: boolean;
  placeholder?: string;
  label?: string;
}) {
  return (
    <Suspense fallback={<div className="search-wrap" aria-hidden="true" />}>
      <SearchForm
        endpoint={endpoint}
        hrefBase={hrefBase}
        itemBase={itemBase}
        showCover={showCover}
        placeholder={placeholder}
        label={label}
      />
    </Suspense>
  );
}
