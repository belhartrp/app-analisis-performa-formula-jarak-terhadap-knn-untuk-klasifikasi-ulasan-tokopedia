"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { api, ComparisonResult, API_BASE, METRICS, METRIC_LABEL, METRIC_COLOR } from "@/lib/api";

export default function HasilPage() {
  const [data, setData] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/api/classify/last")
      .then((res) => setData(res.data))
      .catch(() => setError("Belum ada hasil. Jalankan 'Full Comparison' dulu di halaman Eksperimen."));
  }, []);

  const chartData = data
    ? data.k_values.map((k) => {
        const point: Record<string, any> = { k };
        data.results
          .filter((r) => r.k === k)
          .forEach((r) => {
            point[r.metric] = r.f1_score;
          });
        return point;
      })
    : [];

  const sorted = data
    ? [...data.results].sort((a, b) => METRICS.indexOf(a.metric as any) - METRICS.indexOf(b.metric as any) || a.k - b.k)
    : [];

  const totalDocs = data ? data.fold_sizes.reduce((acc, f) => acc + f.test, 0) : 0;

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-xl font-bold mb-2">Hasil Perbandingan Formula Jarak</h2>
        {error && <p className="text-sm text-negative">{error}</p>}
        {data && (
          <>
            <p className="text-sm text-slate-600 mb-3">
              KNN dengan tiga formula jarak, Stratified {data.n_splits}-Fold Cross-Validation
              ({totalDocs} ulasan, tiap ulasan menjadi data uji satu kali). Nilai = rata-rata seluruh fold.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm mb-5">
              Skenario dengan F1-Score tertinggi: <b>KNN + {METRIC_LABEL[data.best_scenario.metric]}</b> dengan K=
              {data.best_scenario.k}, F1-Score=<b>{data.best_scenario.f1_score}</b>{" "}
              <span className="text-slate-500">(± {data.best_scenario.f1_std})</span>
            </div>

            <h3 className="font-semibold mb-2 text-sm">Ringkasan per Formula Jarak</h3>
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-200">
                    <th className="p-2">Formula Jarak</th>
                    <th className="p-2">K Terbaik</th>
                    <th className="p-2">F1 pada K Terbaik</th>
                    <th className="p-2">Accuracy pada K Terbaik</th>
                    <th className="p-2">Rata-rata F1 (semua K)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.best_per_metric.map((b) => (
                    <tr key={b.metric} className="border-b border-slate-100">
                      <td className="p-2 font-medium">{METRIC_LABEL[b.metric]}</td>
                      <td className="p-2">{b.best_k}</td>
                      <td className="p-2 font-semibold">{b.f1_score} <span className="text-xs font-normal text-slate-400">± {b.f1_std}</span></td>
                      <td className="p-2">{b.accuracy}</td>
                      <td className="p-2">{b.mean_f1_over_k}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3 mb-5">
              <a href={`${API_BASE}/api/export/csv`} className="btn-primary" target="_blank" rel="noreferrer">
                Export CSV
              </a>
              <a href={`${API_BASE}/api/export/pdf`} className="btn-primary" target="_blank" rel="noreferrer">
                Export PDF
              </a>
            </div>

            <h3 className="font-semibold mb-2 text-sm">F1-Score terhadap Nilai K</h3>
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="k" label={{ value: "Nilai K", position: "insideBottom", offset: -5 }} />
                  <YAxis domain={["auto", "auto"]} />
                  <Tooltip />
                  <Legend formatter={(v) => `KNN-${METRIC_LABEL[v as string] ?? v}`} />
                  {METRICS.map((m) => (
                    <Line key={m} type="monotone" dataKey={m} stroke={METRIC_COLOR[m]} strokeWidth={2} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      {data && (
        <div className="card overflow-x-auto">
          <h3 className="font-semibold mb-3">Tabel Rangkuman Seluruh Skenario</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-200">
                <th className="p-2">Formula Jarak</th>
                <th className="p-2">K</th>
                <th className="p-2">Accuracy</th>
                <th className="p-2">Precision</th>
                <th className="p-2">Recall</th>
                <th className="p-2">F1-Score</th>
                <th className="p-2">± F1</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={`${r.metric}-${r.k}`} className="border-b border-slate-100">
                  <td className="p-2">KNN-{METRIC_LABEL[r.metric]}</td>
                  <td className="p-2">{r.k}</td>
                  <td className="p-2">{r.accuracy}</td>
                  <td className="p-2">{r.precision}</td>
                  <td className="p-2">{r.recall}</td>
                  <td className="p-2 font-semibold">{r.f1_score}</td>
                  <td className="p-2 text-slate-500">{r.f1_std}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-slate-500 mt-3">
            ± F1 = simpangan baku F1 antar fold. Jika selisih F1 antar formula lebih kecil daripada
            simpangan baku ini, perbedaannya belum tentu bermakna.
          </p>
        </div>
      )}
    </div>
  );
}
