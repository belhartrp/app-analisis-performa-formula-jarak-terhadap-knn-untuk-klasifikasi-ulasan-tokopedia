"use client";

import { useState, useEffect } from "react";
import { api, TfidfSummary } from "@/lib/api";

export default function TfidfPage() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<TfidfSummary | null>(null);
  const [error, setError] = useState("");

  // Muat ulang ringkasan TF-IDF yang sudah tersimpan di server saat halaman dibuka
  useEffect(() => {
    const loadExisting = async () => {
      try {
        const res = await api.get("/api/tfidf/summary?top_n=20");
        setSummary(res.data);
      } catch {
        // TF-IDF belum pernah diekstraksi, biarkan tampilan kosong
      }
    };
    loadExisting();
  }, []);

  const handleExtract = async () => {
    setLoading(true);
    setError("");
    try {
      await api.post("/api/tfidf/extract");
      const res = await api.get("/api/tfidf/summary?top_n=20");
      setSummary(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Gagal mengekstraksi TF-IDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-xl font-bold mb-2">Ekstraksi Fitur TF-IDF</h2>
        <p className="text-sm text-slate-600 mb-4">
          Mengubah clean text hasil preprocessing menjadi representasi numerik (bobot kata)
          yang akan digunakan sebagai input klasifikasi.
        </p>
        <p className="text-xs text-slate-500 mb-4">
          Normalisasi L2 sengaja dimatikan agar Euclidean dan Cosine tidak menghasilkan urutan tetangga
          yang identik. Halaman ini menampilkan TF-IDF dari seluruh dataset (untuk visualisasi dan demo
          prediksi); pada Eksperimen, TF-IDF dibangun ulang dari data latih di setiap fold.
        </p>
        <button onClick={handleExtract} disabled={loading} className="btn-primary">
          {loading ? "Memproses..." : "Jalankan Ekstraksi TF-IDF"}
        </button>
        {error && <p className="text-sm text-negative mt-3">{error}</p>}
      </div>

      {summary && (
        <div className="card">
          <h3 className="font-semibold mb-3">Ringkasan Matriks TF-IDF</h3>
          <div className="flex gap-6 mb-4 text-sm">
            <p>Total dokumen: <b>{summary.total_documents}</b></p>
            <p>Total kata unik (fitur): <b>{summary.total_features}</b></p>
          </div>
          <h4 className="text-sm font-medium mb-2">Top 20 Kata dengan Bobot Rata-rata Tertinggi</h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-200">
                <th className="p-2">Kata</th>
                <th className="p-2">Bobot Rata-rata</th>
              </tr>
            </thead>
            <tbody>
              {summary.top_words.map((w) => (
                <tr key={w.word} className="border-b border-slate-100">
                  <td className="p-2">{w.word}</td>
                  <td className="p-2">{w.avg_weight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
