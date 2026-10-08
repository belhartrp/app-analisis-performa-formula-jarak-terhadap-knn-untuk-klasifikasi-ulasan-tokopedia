"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MENU = [
  { href: "/", label: "Beranda" },
  { href: "/dataset", label: "Dataset" },
  { href: "/preprocessing", label: "Preprocessing" },
  { href: "/pencarian", label: "Pencarian" },
  { href: "/tfidf", label: "TF-IDF" },
  { href: "/eksperimen", label: "Eksperimen" },
  { href: "/hasil", label: "Hasil" },
  { href: "/demo", label: "Demo Prediksi" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden md:flex md:flex-col md:w-60 md:min-h-screen bg-white border-r border-slate-200 p-4">
        <h1 className="text-lg font-bold text-accent mb-1 px-2">Formula Jarak &amp; KNN</h1>
        <p className="text-xs text-slate-500 mb-6 px-2">Klasifikasi Ulasan Tokopedia</p>
        <nav className="flex flex-col gap-1">
          {MENU.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === item.href
                  ? "bg-blue-50 text-accent"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-between px-1 py-2 z-50 overflow-x-auto">
        {MENU.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 text-center text-[11px] font-medium py-1 rounded-md whitespace-nowrap px-1 ${
              pathname === item.href ? "text-accent" : "text-slate-500"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
