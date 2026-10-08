"use client";

import { useState } from "react";
import { api, METRICS, METRIC_LABEL } from "@/lib/api";

interface SearchResultItem {
  row_id: number;
  raw_text: string;
  clean_text: string;
  dataset_sentiment: string;
  predicted_sentiment: string | null;
  prediction_matches_dataset?: boolean;
}

interface SearchResponse {
  query: string;
  total_matches: number;
  model_ready: boolean;
  config: { metric: string; k: number };
  results: SearchResultItem[];
}

function highlight(text: string, query: string) {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-yellow-200 rounded px-0.5">{part}</mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function PencarianPage() {
  const [query, setQuery] = useState("");
  const [metric, setMetric] = useState("cosine");
  const [k, setK] = useState(5);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/search", {
        params: { query, metric, k },
      });
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Gagal melakukan pencarian");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-xl font-bold mb-2">Pencarian Teks</h2>
        <p className="text-sm text-slate-600 mb-4">
          Cari kata kunci di seluruh dataset (mencocokkan teks mentah maupun clean text —
          jadi mencari "rugi" otomatis menemukan "merugikan" karena setelah stemming
          keduanya menjadi kata dasar yang sama). Setiap hasil menampilkan label asli di
          dataset dan prediksi model (baris itu sendiri dikecualikan dari tetangga saat
          diprediksi, supaya adil).
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Ketik kata kunci, misal: rugi"
            className="flex-1 border border-slate-300 rounded-lg p-2 text-sm"
          />
          <button onClick={handleSearch} disabled={loading} className="btn-primary">
            {loading ? "Mencari..." : "Cari"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium block mb-1">Formula Jarak (untuk prediksi KNN)</label>
            <select value={metric} onChange={(e) => setMetric(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm">
              {METRICS.map((m) => (
                <option key={m} value={m}>{METRIC_LABEL[m]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Nilai K</label>
            <input type="number" value={k} min={1} onChange={(e) => setK(parseInt(e.target.value))} className="w-full border border-slate-300 rounded-lg p-2 text-sm" />
          </div>
        </div>

        {error && <p className="text-sm text-negative mt-3">{error}</p>}
      </div>

      {data && (
        <div className="card overflow-x-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">
              {data.total_matches} hasil untuk "{data.query}"
            </h3>
            {!data.model_ready && (
              <span className="text-xs text-amber-600">
                TF-IDF belum diekstraksi, kolom prediksi kosong
              </span>
            )}
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-200">
                <th className="p-2">Teks Asli</th>
                <th className="p-2">Clean Text</th>
                <th className="p-2">Label Dataset</th>
                <th className="p-2">Prediksi Model</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((r) => (
                <tr key={r.row_id} className="border-b border-slate-100 align-top">
                  <td className="p-2">{highlight(r.raw_text, data.query)}</td>
                  <td className="p-2 text-slate-600">{highlight(r.clean_text, data.query)}</td>
                  <td className="p-2">
                    <span className={r.dataset_sentiment === "Positive" ? "badge-positive" : "badge-negative"}>
                      {r.dataset_sentiment}
                    </span>
                  </td>
                  <td className="p-2">
                    {r.predicted_sentiment ? (
                      <div className="flex items-center gap-2">
                        <span className={r.predicted_sentiment === "Positive" ? "badge-positive" : "badge-negative"}>
                          {r.predicted_sentiment}
                        </span>
                        {r.prediction_matches_dataset === false && (
                          <span className="text-xs text-negative" title="Prediksi model tidak sama dengan label asli">
                            ⚠ beda
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data.total_matches === 0 && (
            <p className="text-sm text-slate-500">Tidak ada hasil yang cocok dengan kata kunci tersebut.</p>
          )}
        </div>
      )}
    </div>
  );
}
