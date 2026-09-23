import Link from "next/link";

export default function NotFound() {
  return (
    <div className="state">
      <strong>Halaman tidak ditemukan</strong>
      Cek ejaan URL atau kembali ke{" "}
      <Link href="/" style={{ color: "var(--accent)" }}>
        home
      </Link>
      .
    </div>
  );
}
