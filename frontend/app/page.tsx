import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-bold mb-2">Analisis Performa Formula Jarak terhadap KNN</h2>
        <p className="text-sm font-medium text-accent mb-3">untuk Klasifikasi Ulasan Tokopedia</p>
        <p className="text-slate-600">
          Aplikasi ini menguji bagaimana pilihan <b>formula (metrik) jarak</b> memengaruhi performa
          algoritma <b>K-Nearest Neighbor (KNN)</b> dalam mengklasifikasikan sentimen ulasan produk
          (Positif/Negatif). Algoritma dan seluruh tahapan lain dibuat sama; satu-satunya yang diubah
          adalah formula jaraknya.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-xs font-semibold text-slate-500 mb-1">FORMULA 1</p>
          <h3 className="font-bold mb-1">Euclidean</h3>
          <p className="text-sm text-slate-600">Jarak lurus antar dua vektor. Peka terhadap panjang ulasan.</p>
        </div>
        <div className="card">
          <p className="text-xs font-semibold text-slate-500 mb-1">FORMULA 2</p>
          <h3 className="font-bold mb-1">Manhattan</h3>
          <p className="text-sm text-slate-600">Jumlah selisih absolut tiap fitur. Satu selisih besar tidak mendominasi.</p>
        </div>
        <div className="card">
          <p className="text-xs font-semibold text-slate-500 mb-1">FORMULA 3</p>
          <h3 className="font-bold mb-1">Cosine</h3>
          <p className="text-sm text-slate-600">Perbedaan arah (sudut) vektor. Tidak terpengaruh panjang ulasan.</p>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-3">Langkah Penggunaan</h3>
        <ol className="list-decimal list-inside space-y-1 text-slate-600 text-sm">
          <li>Upload dataset ulasan produk (CSV) di halaman <b>Dataset</b>.</li>
          <li>Jalankan pembersihan teks di halaman <b>Preprocessing</b>.</li>
          <li>Lihat representasi fitur di halaman <b>TF-IDF</b> (tanpa normalisasi L2).</li>
          <li>
            Jalankan <b>Eksperimen</b>: satu skenario, atau bandingkan ketiga formula jarak dengan
            Stratified 5-Fold Cross-Validation.
          </li>
          <li>Lihat hasil evaluasi (Accuracy, Precision, Recall, F1-Score) di halaman <b>Hasil</b>.</li>
          <li>Coba prediksi teks bebas dengan ketiga formula sekaligus di halaman <b>Demo Prediksi</b>.</li>
        </ol>
      </div>

      <Link href="/dataset" className="btn-primary inline-block">
        Mulai Eksperimen &rarr;
      </Link>
    </div>
  );
}
