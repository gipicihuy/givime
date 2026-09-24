import Link from "next/link";
import { IconEmpty } from "@/components/Icons";

export default function NotFound() {
  return (
    <div className="state">
      <span className="state-icon" aria-hidden>
        <IconEmpty size={36} />
      </span>
      <strong>Halaman tidak ditemukan</strong>
      Cek ejaan URL atau kembali ke{" "}
      <Link href="/" className="btn-play" style={{ marginTop: 8 }}>
        home
      </Link>
    </div>
  );
}
