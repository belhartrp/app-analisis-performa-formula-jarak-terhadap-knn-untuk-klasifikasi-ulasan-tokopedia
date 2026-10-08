"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ScenarioResult, METRICS, METRIC_LABEL } from "@/lib/api";

export default function EksperimenPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"single" | "compare">("compare");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [metric, setMetric] = useState("cosine");
  const [k, setK] = useState(5);
  const [nSplits, setNSplits] = useState(5);
  const [singleResult, setSingleResult] = useState<ScenarioResult | null>(null);

  const [kValues, setKValues] = useState("3,5,7,9,11");

  const handleSingleRun = async () => {
    setLoading(true);
    setError("");
    setSingleResult(null);
    try {
      const res = await api.post("/api/classify/single", { metric, k, n_splits: nSplits });
      setSingleResult(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Gagal menjalankan klasifikasi");
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async () => {
    setLoading(true);
    setError("");
    try {
      const parsedK = kValues.split(",").map((v) => parseInt(v.trim())).filter((v) => !isNaN(v));
      await api.post("/api/classify/compare", { k_values: parsedK, n_splits: nSplits });
      router.push("/hasil");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Gagal menjalankan perbandingan skenario");
    } finally {
      setLoading(false);
    }
  };

  const foldInput = (
    <div>
      <label className="text-xs font-medium block mb-1">Jumlah Fold (Stratified K-Fold)</label>
      <input
        type="number"
        min={2}
        max={10}
        value={nSplits}
        onChange={(e) => setNSplits(parseInt(e.target.value))}
        className="w-full border border-slate-300 rounded-lg p-2 text-sm"
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-xl font-bold mb-1">Eksperimen Klasifikasi</h2>
        <p className="text-sm text-slate-600 mb-4">
          Algoritma tetap <b>KNN</b> (voting mayoritas biasa). Yang diubah hanya formula jarak.
          Evaluasi memakai Stratified K-Fold Cross-Validation; TF-IDF dibangun ulang dari data latih
          setiap fold agar tidak ada kebocoran data.
        </p>
        <div className="flex gap-2 mb-5 border-b border-slate-200">
          <button
            onClick={() => setTab("compare")}
            className={`px-4 py-2 text-sm font-medium ${tab === "compare" ? "border-b-2 border-accent text-accent" : "text-slate-500"}`}
          >
            Full Comparison (3 Skenario)
          </button>
          <button
            onClick={() => setTab("single")}
            className={`px-4 py-2 text-sm font-medium ${tab === "single" ? "border-b-2 border-accent text-accent" : "text-slate-500"}`}
          >
            Single Run
          </button>
        </div>

        {tab === "compare" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Menjalankan otomatis tiga skenario (KNN-Euclidean, KNN-Manhattan, KNN-Cosine) untuk
              setiap nilai K yang dipilih, pada pembagian fold yang identik agar perbandingan adil.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1">Daftar Nilai K (pisahkan koma)</label>
                <input value={kValues} onChange={(e) => setKValues(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm" />
              </div>
              {foldInput}
            </div>
            <button onClick={handleCompare} disabled={loading} className="btn-primary">
              {loading ? "Menjalankan (mohon tunggu)..." : "Jalankan Semua Skenario"}
            </button>
          </div>
        )}

        {tab === "single" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Jalankan satu formula jarak dengan satu nilai K untuk eksplorasi cepat.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1">Formula Jarak</label>
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
              {foldInput}
            </div>
            <button onClick={handleSingleRun} disabled={loading} className="btn-primary">
              {loading ? "Menjalankan..." : "Jalankan Klasifikasi"}
            </button>
          </div>
        )}

        {error && <p className="text-sm text-negative mt-4">{error}</p>}
      </div>

      {singleResult && (
        <div className="card">
          <h3 className="font-semibold mb-1">
            Hasil: KNN + {METRIC_LABEL[singleResult.metric]} (K={singleResult.k})
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Rata-rata ± simpangan baku dari {singleResult.n_splits} fold.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-5">
            <div><p className="text-slate-500">Accuracy</p><p className="font-bold">{singleResult.accuracy} <span className="text-xs font-normal text-slate-400">± {singleResult.accuracy_std}</span></p></div>
            <div><p className="text-slate-500">Precision</p><p className="font-bold">{singleResult.precision} <span className="text-xs font-normal text-slate-400">± {singleResult.precision_std}</span></p></div>
            <div><p className="text-slate-500">Recall</p><p className="font-bold">{singleResult.recall} <span className="text-xs font-normal text-slate-400">± {singleResult.recall_std}</span></p></div>
            <div><p className="text-slate-500">F1-Score</p><p className="font-bold">{singleResult.f1_score} <span className="text-xs font-normal text-slate-400">± {singleResult.f1_std}</span></p></div>
          </div>

          <h4 className="text-sm font-medium mb-2">Hasil per Fold</h4>
          <div className="overflow-x-auto mb-5">
            <table className="text-sm border border-slate-200 w-full">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="p-2 border border-slate-200">Fold</th>
                  <th className="p-2 border border-slate-200">Accuracy</th>
                  <th className="p-2 border border-slate-200">Precision</th>
                  <th className="p-2 border border-slate-200">Recall</th>
                  <th className="p-2 border border-slate-200">F1-Score</th>
                </tr>
              </thead>
              <tbody>
                {singleResult.folds.map((f) => (
                  <tr key={f.fold}>
                    <td className="p-2 border border-slate-200">{f.fold}</td>
                    <td className="p-2 border border-slate-200">{f.accuracy}</td>
                    <td className="p-2 border border-slate-200">{f.precision}</td>
                    <td className="p-2 border border-slate-200">{f.recall}</td>
                    <td className="p-2 border border-slate-200">{f.f1_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h4 className="text-sm font-medium mb-1">Confusion Matrix (gabungan seluruh fold)</h4>
          <p className="text-xs text-slate-500 mb-2">Setiap ulasan menjadi data uji tepat satu kali, sehingga jumlah seluruh sel sama dengan jumlah data.</p>
          <table className="text-sm border border-slate-200">
            <thead>
              <tr>
                <th className="p-2 border border-slate-200"></th>
                {singleResult.labels_order.map((l) => (
                  <th key={l} className="p-2 border border-slate-200">Pred: {l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {singleResult.confusion_matrix.map((row, i) => (
                <tr key={i}>
                  <td className="p-2 border border-slate-200 font-medium">Aktual: {singleResult.labels_order[i]}</td>
                  {row.map((val, j) => (
                    <td key={j} className="p-2 border border-slate-200 text-center">{val}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
