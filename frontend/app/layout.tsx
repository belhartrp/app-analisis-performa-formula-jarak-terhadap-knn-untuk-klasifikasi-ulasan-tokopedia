import "./globals.css";
import { Fredoka } from "next/font/google";
import Sidebar from "@/components/Sidebar";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fredoka",
});

export const metadata = {
  title: "Analisis Performa Formula Jarak terhadap KNN",
  description: "Aplikasi demo analisis performa formula (metrik) jarak Euclidean, Manhattan, dan Cosine terhadap KNN untuk klasifikasi sentimen ulasan Tokopedia",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={fredoka.variable}>
      <body className="font-sans">
        <div className="flex flex-col md:flex-row min-h-screen">
          <Sidebar />
          <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8 max-w-6xl mx-auto w-full">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
