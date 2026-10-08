"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface PreprocessingRow {
  row_id: number;
  raw_text: string;
  clean_text: string;
  sentiment: string;
  unmapped_slang_words: string[];
  antonym_substitutions: string[];
}

interface PreprocessingStages {
  row_id: number;
  raw_text: string;
  case_folding: string;
  cleaning: string;
  tokenization: string[];
  normalize_slang: string[];
  unmapped_slang_words: string[];
  convert_negation: string[];
  stopword_removal: string[];
  stemming: string[];
  antonym_substitutions: string[];
  clean_text: string;
  sentiment: string;
}

interface UnmappedSummary {
  total_documents: number;
  documents_with_unmapped_words: number;
  total_unique_unmapped_words: number;
  top_unmapped_words: { word: string; count: number }[];
}

const STAGE_LABELS: [keyof PreprocessingStages, string][] = [
  ["raw_text", "Teks Mentah"],
  ["case_folding", "Case Folding"],
  ["cleaning", "Cleaning (+ lengthening)"],
  ["tokenization", "Tokenization"],
  ["normalize_slang", "Normalisasi Slang"],
  ["convert_negation", "Convert Negation"],
  ["stopword_removal", "Stopword Removal"],
  ["stemming", "Stemming"],
];

export default function PreprocessingPage() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<PreprocessingRow[]>([]);
  const [detail, setDetail] = useState<PreprocessingStages | null>(null);
  const [summary, setSummary] = useState<UnmappedSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadExisting = async () => {
      try {
        const res = await api.get("/api/preprocessing/summary?page=1&page_size=15");
        setRows(res.data.data);
        const summaryRes = await api.get("/api/preprocessing/unmapped-slang-summary?top_n=30");
        setSummary(summaryRes.data);
      } catch {
        // preprocessing belum pernah dijalankan, biarkan tampilan kosong
      }
    };
    loadExisting();
  }, []);

  const handleRun = async () => {
    setLoading(true);
    setError("");
    try {
      await api.post("/api/preprocessing/run");
      const res = await api.get("/api/preprocessing/summary?page=1&page_size=15");
      setRows(res.data.data);
      const summaryRes = await api.get("/api/preprocessing/unmapped-slang-summary?top_n=30");
      setSummary(summaryRes.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Gagal menjalankan preprocessing");
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (rowId: number) => {
    const res = await api.get(`/api/preprocessing/result/${rowId}`);
    setDetail(res.data);
  };

  const renderStageValue = (value: string | string[]) =>
    Array.isArray(value) ? value.join(" ") : value;

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-xl font-bold mb-2">Text Preprocessing</h2>
        <p className="text-sm text-slate-600 mb-4">
          Jalankan pembersihan teks ke seluruh dataset (7 tahap), termasuk normalisasi character
          lengthening, normalisasi slang (kamus_alay.csv), dan penanganan negasi dengan penanda NEG_.
          Klik salah satu baris untuk melihat detail per tahap.
        </p>
        <button onClick={handleRun} disabled={loading} className="btn-primary">
          {loading ? "Memproses..." : "Jalankan Preprocessing"}
        </button>
        {error && <p className="text-sm text-negative mt-3">{error}</p>}
      </div>

      {summary && (
        <div className="card">
          <h3 className="font-semibold mb-3">Cakupan Kamus Slang (kamus_alay.csv)</h3>
          <div className="grid grid-cols-2 gap-3 text-sm mb-3">
            <div><p className="text-slate-500">Dokumen dengan kata tak-terpetakan</p><p className="font-bold">{summary.documents_with_unmapped_words} / {summary.total_documents}</p></div>
            <div><p className="text-slate-500">Kata unik tak-terpetakan</p><p className="font-bold">{summary.total_unique_unmapped_words}</p></div>
          </div>
          <p className="text-xs text-slate-500 mb-2">
            Ini bukan kesalahan — daftar ini hanya menunjukkan kata yang belum ada sebagai
            entri di kamus_alay.csv. Kata yang sudah baku wajar muncul di sini.
          </p>
          <div className="flex flex-wrap gap-2">
            {summary.top_unmapped_words.map((w) => (
              <span key={w.word} className="text-xs bg-slate-100 px-2 py-1 rounded-full">
                {w.word} <span className="text-slate-400">({w.count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="card overflow-x-auto">
          <h3 className="font-semibold mb-3">Hasil Preprocessing (klik baris untuk detail)</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-200">
                <th className="p-2">Teks Mentah</th>
                <th className="p-2">Clean Text</th>
                <th className="p-2">Sentiment</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.row_id}
                  onClick={() => openDetail(r.row_id)}
                  className="border-b border-slate-100 cursor-pointer hover:bg-slate-50"
                >
                  <td className="p-2">{r.raw_text}</td>
                  <td className="p-2 text-slate-500">
                    {r.clean_text}
                    {r.antonym_substitutions.length > 0 && (
                      <span className="ml-2 text-xs text-blue-600" title={r.antonym_substitutions.join(", ")}>
                        (+antonim)
                      </span>
                    )}
                  </td>
                  <td className="p-2">{r.sentiment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detail && (
        <div className="card">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">Detail Tahapan - Baris #{detail.row_id}</h3>
            <button onClick={() => setDetail(null)} className="text-sm text-slate-500">
              Tutup
            </button>
          </div>
          <div className="space-y-2">
            {STAGE_LABELS.map(([key, label]) => (
              <div key={key} className="flex flex-col sm:flex-row sm:gap-3 text-sm border-b border-slate-100 pb-2">
                <span className="font-medium w-40 shrink-0">{label}</span>
                <span className="text-slate-600 break-words">{renderStageValue(detail[key] as any)}</span>
              </div>
            ))}
            <div className="flex flex-col sm:flex-row sm:gap-3 text-sm border-b border-slate-100 pb-2">
              <span className="font-medium w-40 shrink-0">Tak Terpetakan Kamus</span>
              <span className="text-slate-500 break-words">
                {detail.unmapped_slang_words.length > 0 ? detail.unmapped_slang_words.join(", ") : "(tidak ada)"}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:gap-3 text-sm border-b border-slate-100 pb-2">
              <span className="font-medium w-40 shrink-0">Substitusi Antonim</span>
              <span className="text-blue-600 break-words">
                {detail.antonym_substitutions.length > 0 ? detail.antonym_substitutions.join(", ") : "(tidak ada)"}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:gap-3 text-sm border-b border-slate-100 pb-2">
              <span className="font-medium w-40 shrink-0">Clean Text Akhir</span>
              <span className="text-slate-800 font-medium break-words">{detail.clean_text}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
