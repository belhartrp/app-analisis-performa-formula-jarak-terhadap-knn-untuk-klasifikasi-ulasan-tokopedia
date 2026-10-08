# Catatan Perubahan — Judul: Analisis Performa Formula Jarak terhadap KNN untuk Klasifikasi Ulasan Tokopedia

## Yang berubah
- WKNN dihapus. Algoritma tunggal: KNN (voting mayoritas biasa).
- Tiga formula jarak dibandingkan: Euclidean, Manhattan, Cosine.
- Evaluasi: Stratified 5-Fold Cross-Validation (sebelumnya satu kali split 80/20),
  sesuai Bab I. TF-IDF di-fit ulang pada data latih TIAP FOLD (tanpa kebocoran data).
- TF-IDF tanpa normalisasi L2 (norm=None), supaya Euclidean dan Cosine tidak identik.
- /api/classify/single dan /compare: parameter `algorithm` dan `test_size` dihapus,
  diganti `n_splits`. Hasil berisi rata-rata dan simpangan baku antar fold.
- /api/predict: memprediksi dengan ketiga formula sekaligus + menampilkan tetangga terdekat.
- /api/search: parameter `algorithm` dihapus; `metric` menerima euclidean|manhattan|cosine.

## Yang TIDAK berubah
- Dataset, balancing, preprocessing 7 tahap (substitusi antonim tetap nonaktif), halaman TF-IDF.

## Menjalankan
Sama seperti sebelumnya: jalankan start-backend.ps1 dan start-frontend.ps1.
