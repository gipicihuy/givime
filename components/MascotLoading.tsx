export function MascotLoading({ className }: { className?: string }) {
  return (
    <div className={className} role="status">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="mascot-loading-img" src="/loading.webp" alt="" aria-hidden="true" />
      <p className="mascot-loading-text">sabar yaa, server kami butuh waktu untuk merespon 😖</p>
    </div>
  );
}
