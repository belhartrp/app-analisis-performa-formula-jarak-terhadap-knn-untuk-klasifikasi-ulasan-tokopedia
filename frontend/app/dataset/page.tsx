"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Database, BarChart3, Scale, Table2, RotateCcw, Wand2 } from "lucide-react";
import { api, DatasetStats } from "@/lib/api";
import Pagination from "@/components/Pagination";
import FileUploadZone from "@/components/FileUploadZone";

interface ClassCounts {
  total_rows: number;
  counts: Record<string, number>;
}

interface ClassPreviewData {
  sentiment: string;
  total_available: number;
  returned: number;
  data: Record<string, any>[];
}

const CLASS_PAGE_SIZE = 5;

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (delay: number = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.4, delay } }),
};

function StatBox({ label, value, color, icon }: { label: string; value: number; color: "indigo" | "green" | "red"; icon: React.ReactNode }) {
  const styles = {
    indigo: "bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600",
    green: "bg-gradient-to-br from-green-50 to-green-100 text-green-600",
    red: "bg-gradient-to-br from-red-50 to-red-100 text-red-600",
  }[color];

  return (
    <motion.div whileHover={{ y: -3 }} className={`rounded-2xl p-4 ${styles}`}>
      <div className="flex items-center gap-2 mb-2 opacity-80">
        {icon}
        <p className="text-xs font-medium">{label}</p>
      </div>
      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
    </motion.div>
  );
}

function ClassPreviewTable({
  title,
  border,
  data,
  delay,
}: {
  title: string;
  border: "green" | "red";
  data: ClassPreviewData | null;
  delay: number;
}) {
  const [page, setPage] = useState(1);
  if (!data) return null;

  const totalPages = Math.max(1, Math.ceil(data.data.length / CLASS_PAGE_SIZE));
  const start = (page - 1) * CLASS_PAGE_SIZE;
  const rows = data.data.slice(start, start + CLASS_PAGE_SIZE);
  const borderClass = border === "green" ? "border-green-500" : "border-red-500";
  const dotClass = border === "green" ? "bg-green-500" : "bg-red-500";

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" custom={delay} className="card">
      <div className={`flex justify-between items-center mb-4 pl-3 border-l-4 ${borderClass}`}>
        <h3 className="font-semibold flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${dotClass}`} />
          {title}
        </h3>
        <span className="text-xs text-slate-400">{data.total_available} data</span>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map((row, i) => (
          <motion.div
            key={start + i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.03 }}
            className="py-3 flex gap-3 text-sm"
          >
            <span className="text-slate-400 w-6 shrink-0">{start + i + 1}.</span>
            <span className="text-slate-700">{row["Customer Review"]}</span>
          </motion.div>
        ))}
      </div>
      <div className="mt-4">
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </motion.div>
  );
}

export default function DatasetPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");

  const [stats, setStats] = useState<DatasetStats | null>(null);
  const [classCounts, setClassCounts] = useState<ClassCounts | null>(null);
  const [positivePreview, setPositivePreview] = useState<ClassPreviewData | null>(null);
  const [negativePreview, setNegativePreview] = useState<ClassPreviewData | null>(null);

  const [nPositive, setNPositive] = useState<number>(0);
  const [nNegative, setNNegative] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceMessage, setBalanceMessage] = useState("");
  const [balanceError, setBalanceError] = useState("");

  const loadAll = async () => {
    try {
      const statsRes = await api.get("/api/dataset/stats");
      setStats(statsRes.data);

      const countsRes = await api.get("/api/dataset/class-counts");
      setClassCounts(countsRes.data);
      setNPositive(countsRes.data.counts["Positive"] || 0);
      setNNegative(countsRes.data.counts["Negative"] || 0);

      const posRes = await api.get("/api/dataset/preview-by-class?sentiment=Positive&limit=500");
      setPositivePreview(posRes.data);
      const negRes = await api.get("/api/dataset/preview-by-class?sentiment=Negative&limit=500");
      setNegativePreview(negRes.data);
    } catch {
      // belum ada dataset
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setBalanceMessage("");
    const formData = new FormData();
    formData.append("file", file);

    try {
      await api.post("/api/dataset/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadedFileName(file.name);
      await loadAll();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Gagal mengupload dataset");
    } finally {
      setLoading(false);
    }
  };

  const handleAutoBalance = () => {
    if (!classCounts) return;
    const minCount = Math.min(classCounts.counts["Positive"] || 0, classCounts.counts["Negative"] || 0);
    setNPositive(minCount);
    setNNegative(minCount);
  };

  const handleBalance = async () => {
    setBalanceLoading(true);
    setBalanceError("");
    setBalanceMessage("");
    try {
      const res = await api.post("/api/dataset/balance", {
        n_positive: nPositive,
        n_negative: nNegative,
      });
      setBalanceMessage(`Balancing diterapkan: ${res.data.total_rows} baris data.`);
      const statsRes = await api.get("/api/dataset/stats");
      setStats(statsRes.data);
    } catch (err: any) {
      setBalanceError(err?.response?.data?.detail || "Gagal menerapkan balancing");
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleResetBalance = async () => {
    setBalanceLoading(true);
    setBalanceError("");
    try {
      await api.post("/api/dataset/reset-balance");
      setBalanceMessage("Dataset dikembalikan ke data asli.");
      await loadAll();
    } catch (err: any) {
      setBalanceError(err?.response?.data?.detail || "Gagal mereset dataset");
    } finally {
      setBalanceLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
        <h1 className="text-2xl font-bold">Dataset</h1>
        <p className="text-slate-500 text-sm">Kelola dataset, seimbangkan data, dan lihat preview sampel.</p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6">
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0.05} className="card md:col-span-1">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-500" /> Upload Dataset
          </h3>

          <FileUploadZone onFileSelected={setFile} selectedFileName={file?.name} />

          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="btn-primary w-full mt-3"
          >
            {loading ? "Mengupload..." : "Upload"}
          </button>

          {uploadedFileName && (
            <div className="bg-slate-50 rounded-xl p-3 flex justify-between items-center text-sm mt-3">
              <div>
                <p className="font-medium">{uploadedFileName}</p>
                <p className="text-positive text-xs">Upload berhasil</p>
              </div>
              <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-1 rounded-full font-medium">CSV</span>
            </div>
          )}

          {stats && (
            <>
              <hr className="border-slate-100 my-3" />
              <p className="text-xs text-slate-500">Total Rows</p>
              <p className="text-xl font-bold">{stats.total_rows.toLocaleString()}</p>
            </>
          )}
          {error && <p className="text-sm text-negative mt-3">{error}</p>}
        </motion.div>

        {stats && (
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0.1} className="card md:col-span-2">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-500" /> Dataset Statistics
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <StatBox label="Total Data" value={stats.total_rows} color="indigo" icon={<Database className="w-3.5 h-3.5" />} />
              <StatBox label="Positive" value={stats.distribusi_kelas["Positive"] || 0} color="green" icon={<BarChart3 className="w-3.5 h-3.5" />} />
              <StatBox label="Negative" value={stats.distribusi_kelas["Negative"] || 0} color="red" icon={<BarChart3 className="w-3.5 h-3.5" />} />
            </div>
          </motion.div>
        )}
      </div>

      {classCounts && (
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0.15} className="card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Scale className="w-4 h-4 text-indigo-500" /> Data Balancing
          </h3>
          <div className="grid md:grid-cols-[1fr_1fr_auto] gap-4 items-stretch">
            <div className="rounded-2xl border-l-4 border-green-500 bg-green-50 p-4">
              <p className="text-green-700 font-medium mb-3 text-sm">Positive Data</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Jumlah Data</label>
                  <input
                    type="number"
                    min={1}
                    max={classCounts.counts["Positive"] || 0}
                    value={nPositive}
                    onChange={(e) => setNPositive(parseInt(e.target.value) || 0)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Max Available</label>
                  <p className="p-2 text-sm font-medium">{classCounts.counts["Positive"] || 0}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border-l-4 border-red-500 bg-red-50 p-4">
              <p className="text-red-700 font-medium mb-3 text-sm">Negative Data</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Jumlah Data</label>
                  <input
                    type="number"
                    min={1}
                    max={classCounts.counts["Negative"] || 0}
                    value={nNegative}
                    onChange={(e) => setNNegative(parseInt(e.target.value) || 0)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Max Available</label>
                  <p className="p-2 text-sm font-medium">{classCounts.counts["Negative"] || 0}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 justify-center min-w-[160px]">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleAutoBalance}
                className="bg-indigo-600 text-white rounded-xl px-4 py-2 text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-indigo-700"
              >
                <Wand2 className="w-4 h-4" /> Auto Balance
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleBalance}
                disabled={balanceLoading}
                className="bg-indigo-100 text-indigo-700 rounded-xl px-4 py-2 text-sm font-medium hover:bg-indigo-200 disabled:opacity-50"
              >
                {balanceLoading ? "Menerapkan..." : "Apply Balancing"}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleResetBalance}
                disabled={balanceLoading}
                className="border border-slate-300 rounded-xl px-4 py-2 text-sm font-medium hover:bg-slate-50 flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" /> Reset to Original
              </motion.button>
            </div>
          </div>
          {balanceMessage && <p className="text-sm text-positive mt-3">{balanceMessage}</p>}
          {balanceError && <p className="text-sm text-negative mt-3">{balanceError}</p>}
        </motion.div>
      )}

      {(positivePreview || negativePreview) && (
        <div className="space-y-4">
          <motion.h2 variants={fadeUp} initial="hidden" animate="show" custom={0.2} className="text-lg font-bold flex items-center gap-2">
            <Table2 className="w-5 h-5 text-indigo-500" /> Dataset Preview
          </motion.h2>
          <div className="grid md:grid-cols-2 gap-6">
            <ClassPreviewTable title="Positive Data" border="green" data={positivePreview} delay={0.25} />
            <ClassPreviewTable title="Negative Data" border="red" data={negativePreview} delay={0.3} />
          </div>
        </div>
      )}
    </div>
  );
}
