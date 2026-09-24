"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f0f10",
          color: "#f2f2f3",
          fontFamily: "system-ui, sans-serif",
          padding: 24,
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <strong style={{ display: "block", fontSize: 18, marginBottom: 8 }}>
            Terjadi kesalahan
          </strong>
          <p style={{ color: "#9b9ba3", fontSize: 14, lineHeight: 1.5, margin: "0 0 16px" }}>
            Gagal memuat Givime. Coba lagi sebentar lagi.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              font: "inherit",
              fontSize: 14,
              fontWeight: 700,
              padding: "10px 16px",
              borderRadius: 8,
              border: 0,
              cursor: "pointer",
              background: "#bfff3a",
              color: "#121a00",
            }}
          >
            Coba lagi
          </button>
        </div>
      </body>
    </html>
  );
}
