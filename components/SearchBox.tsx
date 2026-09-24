"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { IconSearch } from "@/components/Icons";

function SearchForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  useEffect(() => {
    setQ(params.get("q") ?? "");
  }, [params]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  return (
    <form className="search-form" role="search" onSubmit={onSubmit}>
      <label htmlFor="q" className="sr-only">
        Cari anime
      </label>
      <span className="search-icon" aria-hidden>
        <IconSearch size={15} />
      </span>
      <input
        id="q"
        className="search-input"
        type="search"
        name="q"
        placeholder="Cari anime…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoComplete="off"
      />
    </form>
  );
}

export function SearchBox() {
  return (
    <Suspense fallback={<div className="search-form" aria-hidden="true" />}>
      <SearchForm />
    </Suspense>
  );
}
