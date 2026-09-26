export default function SearchLoading() {
  return (
    <>
      <h1 className="page-title">Cari</h1>
      <p className="page-sub">Mencari hasil…</p>
      <div className="search-results" aria-hidden="true">
        <div className="poster-grid">
          {Array.from({ length: 12 }, (_, i) => (
            <div className="skel-poster" key={i} />
          ))}
        </div>
      </div>
    </>
  );
}
