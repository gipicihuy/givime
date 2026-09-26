"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { IconSearch } from "@/components/Icons";
import type { SuggestItem } from "@/lib/api";

function SearchForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [items, setItems] = useState<SuggestItem[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setQ(params.get("q") ?? "");
    setOpen(false);
    setActive(-1);
  }, [params]);

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

  const fetchSuggest = useCallback((term: string) => {
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
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(term)}`, {
          signal: ac.signal,
        });
        if (!res.ok) throw new Error("suggest failed");
        const data = (await res.json()) as { items: SuggestItem[] };
        setItems(data.items);
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
  }, []);

  function onChange(value: string) {
    setQ(value);
    fetchSuggest(value);
  }

  function goSearch(term: string) {
    const t = term.trim();
    if (!t) return;
    setOpen(false);
    setActive(-1);
    router.push(`/search?q=${encodeURIComponent(t)}`);
  }

  function goAnime(slug: string) {
    setOpen(false);
    setActive(-1);
    router.push(`/anime/${slug}`);
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
          Cari anime
        </label>
        <span className="search-icon" aria-hidden>
          <IconSearch size={16} />
        </span>
        <input
          id="q"
          className="search-input"
          type="search"
          name="q"
          placeholder="Cari judul anime…"
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
                {item.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="suggest-thumb" src={item.cover} alt="" loading="lazy" width={36} height={54} />
                ) : (
                  <span className="suggest-thumb suggest-thumb-ph" aria-hidden />
                )}
                <span className="suggest-body">
                  <span className="suggest-title">{item.title}</span>
                  <span className="suggest-meta">
                    {item.totalEps ? `${item.totalEps} Eps` : item.status || "—"}
                    {item.score ? ` · ★ ${item.score}` : ""}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

export function SearchBox() {
  return (
    <Suspense fallback={<div className="search-wrap" aria-hidden="true" />}>
      <SearchForm />
    </Suspense>
  );
}
