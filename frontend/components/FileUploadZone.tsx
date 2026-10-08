"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { UploadCloud, FileCheck2 } from "lucide-react";

interface FileUploadZoneProps {
  onFileSelected: (file: File) => void;
  selectedFileName?: string;
}

export default function FileUploadZone({ onFileSelected, selectedFileName }: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (files && files[0]) onFileSelected(files[0]);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 flex flex-col items-center justify-center text-center transition-colors duration-200 ${
        isDragging
          ? "border-indigo-500 bg-indigo-50"
          : selectedFileName
          ? "border-indigo-200 bg-indigo-50/40"
          : "border-slate-300 bg-slate-50 hover:bg-slate-100"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {selectedFileName ? (
        <>
          <motion.div initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}>
            <FileCheck2 className="w-9 h-9 text-indigo-600 mb-2" strokeWidth={1.75} />
          </motion.div>
          <p className="text-sm font-medium text-slate-700">{selectedFileName}</p>
          <p className="text-xs text-slate-400 mt-1">Klik atau tarik file lain untuk mengganti</p>
        </>
      ) : (
        <>
          <UploadCloud className="w-9 h-9 text-slate-400 mb-2" strokeWidth={1.75} />
          <p className="text-sm font-medium text-slate-600">Klik atau tarik file CSV ke sini</p>
          <p className="text-xs text-slate-400 mt-1">
            Format .csv, kolom wajib: <code>Customer Review</code>, <code>Sentiment</code>
          </p>
        </>
      )}
    </motion.div>
  );
}
