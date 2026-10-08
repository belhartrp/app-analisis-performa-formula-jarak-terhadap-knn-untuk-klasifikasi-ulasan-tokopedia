"""
Modul ekstraksi fitur TF-IDF dari clean_text hasil preprocessing.
"""

from sklearn.feature_extraction.text import TfidfVectorizer
import numpy as np


def build_tfidf(clean_texts: list[str]):
    """
    Membangun matriks TF-IDF dari daftar clean_text.
    Mengembalikan vectorizer (untuk transform data baru) dan matriks (sparse).
    """
    # norm=None: normalisasi L2 dimatikan agar Euclidean dan Cosine tidak
    # menghasilkan urutan tetangga yang identik (lihat Bab I dan Bab II).
    # Catatan: fungsi ini dipakai untuk visualisasi di halaman TF-IDF dan untuk
    # prediksi interaktif. Evaluasi (Eksperimen) memakai TF-IDF yang di-fit ulang
    # pada data latih tiap fold di classification_service.cross_validate.
    vectorizer = TfidfVectorizer(norm=None)
    matrix = vectorizer.fit_transform(clean_texts)
    return vectorizer, matrix


def get_summary(vectorizer: TfidfVectorizer, matrix, top_n: int = 20) -> dict:
    """
    Ringkasan matriks TF-IDF: jumlah fitur (kata unik) dan top-N kata
    dengan rata-rata bobot tertinggi di seluruh dokumen.
    """
    feature_names = vectorizer.get_feature_names_out()
    mean_weights = np.asarray(matrix.mean(axis=0)).flatten()

    order = np.argsort(mean_weights)[::-1][:top_n]
    top_words = [
        {"word": feature_names[i], "avg_weight": round(float(mean_weights[i]), 5)}
        for i in order
    ]

    return {
        "total_documents": matrix.shape[0],
        "total_features": matrix.shape[1],
        "top_words": top_words,
    }


def get_document_weights(vectorizer: TfidfVectorizer, matrix, row_index: int, top_n: int = 15) -> list[dict]:
    """
    Bobot TF-IDF untuk satu dokumen tertentu, diurutkan dari bobot tertinggi.
    """
    feature_names = vectorizer.get_feature_names_out()
    row = matrix[row_index].toarray().flatten()
    order = np.argsort(row)[::-1]

    result = []
    for i in order:
        if row[i] <= 0:
            break
        result.append({"word": feature_names[i], "weight": round(float(row[i]), 5)})
        if len(result) >= top_n:
            break
    return result
