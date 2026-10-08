"use client";

import { useState } from "react";
import { api } from "@/lib/api";

interface Neighbor {
  row_id: number;
  clean_text: string;
  sentiment: string;
  distance: number;
}

interface MetricPrediction {
  metric: string;
  label: string;
  predicted_sentiment: string;
  neighbors: Neighbor[];
}

export default function DemoPage() {
  const [text, setText] = useState("");
  const [k, setK] = useState(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handlePredict = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await api.post("/api/predict", { text, k });
      setResult(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Gagal melakukan prediksi");
    } finally {
      setLoading(false);
    }
  };

  const badge = (s: string) => (s === "Positive" ? "badge-positive" : "badge-negative");

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-xl font-bold mb-2">Demo Prediksi Interaktif</h2>
        <p className="text-sm text-slate-600 mb-4">
          Ketik ulasan produk apa saja. Sistem memprosesnya lalu memprediksi sentimennya dengan
          <b> KNN menggunakan ketiga formula jarak sekaligus</b>, sehingga kamu bisa melihat langsung
          apakah pilihan formula mengubah hasil. Model memakai TF-IDF seluruh dataset (hasil halaman TF-IDF).
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Contoh: barang tidak rusak"
          className="w-full border border-slate-300 rounded-lg p-3 text-sm h-24 mb-4"
        />

        <div className="flex items-end gap-3 mb-4">
          <div className="w-40">
            <label className="text-xs font-medium block mb-1">Nilai K</label>
            <input type="number" value={k} min={1} onChange={(e) => setK(parseInt(e.target.value))} className="w-full border border-slate-300 rounded-lg p-2 text-sm" />
          </div>
          <button onClick={handlePredict} disabled={loading} className="btn-primary">
            {loading ? "Memproses..." : "Prediksi Sentimen"}
          </button>
        </div>
        {error && <p className="text-sm text-negative mt-3">{error}</p>}
      </div>

      {result && (
        <>
          <div className="card">
            <h3 className="font-semibold mb-3">Hasil Prediksi per Formula Jarak (K={result.k})</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              {result.predictions.map((p: MetricPrediction) => (
                <div key={p.metric} className="border border-slate-200 rounded-lg p-4 text-center">
                  <p className="text-xs font-semibold text-slate-500 mb-2">KNN + {p.label}</p>
                  <span className={badge(p.predicted_sentiment)}>{p.predicted_sentiment}</span>
                </div>
              ))}
            </div>
            <p className="text-sm mt-4 text-slate-600">
              {result.all_agree
                ? "Ketiga formula jarak menghasilkan prediksi yang sama untuk ulasan ini."
                : "Ketiga formula jarak menghasilkan prediksi yang berbeda untuk ulasan ini — lihat tetangga terdekat masing-masing di bawah."}
            </p>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-3">Tahapan Preprocessing</h3>
            <div className="space-y-2 text-sm">
              <div className="flex flex-col sm:flex-row sm:gap-3 border-b border-slate-100 pb-2">
                <span className="font-medium w-40 shrink-0">Teks Asli</span>
                <span className="text-slate-600">{result.stages.raw_text}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-3 border-b border-slate-100 pb-2">
                <span className="font-medium w-40 shrink-0">Setelah Negasi</span>
                <span className="text-slate-600">{result.stages.convert_negation.join(" ")}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-3 pb-2">
                <span className="font-medium w-40 shrink-0">Clean Text</span>
                <span className="text-slate-800 font-medium">{result.stages.clean_text}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-1">{result.k} Tetangga Terdekat per Formula</h3>
            <p className="text-xs text-slate-500 mb-4">
              Jarak dari ketiga formula memiliki skala berbeda, jadi angkanya tidak untuk dibandingkan
              antar formula; yang dibandingkan adalah siapa tetangga terdekatnya.
            </p>
            <div className="space-y-5">
              {result.predictions.map((p: MetricPrediction) => (
                <div key={p.metric}>
                  <h4 className="text-sm font-semibold mb-2">{p.label}</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b border-slate-200">
                          <th className="p-2">#</th>
                          <th className="p-2">Clean Text Tetangga</th>
                          <th className="p-2">Label</th>
                          <th className="p-2">Jarak</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.neighbors.map((n, i) => (
                          <tr key={n.row_id} className="border-b border-slate-100">
                            <td className="p-2">{i + 1}</td>
                            <td className="p-2 text-slate-600">{n.clean_text}</td>
                            <td className="p-2"><span className={badge(n.sentiment)}>{n.sentiment}</span></td>
                            <td className="p-2">{n.distance}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
