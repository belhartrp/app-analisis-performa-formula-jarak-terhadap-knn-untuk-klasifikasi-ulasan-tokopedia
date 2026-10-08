"""
Entry point FastAPI - Backend Analisis Performa Formula (Metrik) Jarak
terhadap KNN untuk Klasifikasi Ulasan Tokopedia.

Algoritma tetap KNN; yang dibandingkan adalah tiga metrik jarak:
Euclidean, Manhattan, dan Cosine. Evaluasi memakai Stratified 5-Fold
Cross-Validation.

Fitur: Dataset (+ Balancing), Preprocessing (+ pelacakan kata tak-terpetakan
kamus slang), Pencarian Teks, TF-IDF, Klasifikasi (Single Run & Full
Comparison), Prediksi Interaktif (ketiga metrik sekaligus), dan Export.
State disimpan di memori (tanpa database), sesuai kesepakatan single-user demo.
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from collections import Counter
import pandas as pd
import numpy as np
import io

from preprocessing_service import run_pipeline
from tfidf_service import build_tfidf, get_summary, get_document_weights
from classification_service import (
    run_single_scenario, run_full_comparison, compute_distance,
    rank_neighbors, predict_from_ranking, nearest_neighbors,
    METRICS, METRIC_LABELS,
)

app = FastAPI(title="Analisis Performa Formula Jarak terhadap KNN API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

STATE = {
    "original_dataset": None,  # dataset mentah persis seperti yang diupload, tidak pernah diubah
    "dataset": None,           # dataset AKTIF yang dipakai ke tahap berikutnya (bisa hasil balancing)
    "preprocessed": None,
    "vectorizer": None,
    "tfidf_matrix": None,
    "labels": None,
    "last_comparison": None,
}


def _reset_downstream_state():
    """Dipanggil setiap kali dataset aktif berubah (upload baru / balancing / reset)."""
    STATE["preprocessed"] = None
    STATE["vectorizer"] = None
    STATE["tfidf_matrix"] = None
    STATE["labels"] = None
    STATE["last_comparison"] = None


# ================== DATASET ==================

@app.post("/api/dataset/upload")
async def upload_dataset(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(400, "File harus berformat CSV")

    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(400, f"Gagal membaca CSV: {e}")

    required_cols = {"Customer Review", "Sentiment"}
    if not required_cols.issubset(set(df.columns)):
        raise HTTPException(400, f"Kolom wajib tidak ditemukan. Dibutuhkan: {required_cols}")

    STATE["original_dataset"] = df.reset_index(drop=True)
    STATE["dataset"] = df.reset_index(drop=True)
    _reset_downstream_state()

    return {"message": "Dataset berhasil diupload", "total_rows": len(df), "columns": list(df.columns)}


@app.get("/api/dataset/preview")
async def preview_dataset(page: int = 1, page_size: int = 20):
    df = STATE["dataset"]
    if df is None:
        raise HTTPException(400, "Belum ada dataset yang diupload")
    start, end = (page - 1) * page_size, page * page_size
    total_pages = max(1, -(-len(df) // page_size))  # ceiling division
    return {
        "total_rows": len(df),
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "data": df.iloc[start:end].to_dict(orient="records"),
    }


@app.get("/api/dataset/stats")
async def dataset_stats():
    df = STATE["dataset"]
    if df is None:
        raise HTTPException(400, "Belum ada dataset yang diupload")
    return {"total_rows": len(df), "distribusi_kelas": df["Sentiment"].value_counts().to_dict()}


@app.get("/api/dataset/class-counts")
async def class_counts():
    """Jumlah data per kelas pada dataset ASLI (sebelum balancing) -- dipakai
    frontend untuk menentukan batas maksimum slider/input balancing."""
    df = STATE["original_dataset"]
    if df is None:
        raise HTTPException(400, "Belum ada dataset yang diupload")
    return {"total_rows": len(df), "counts": df["Sentiment"].value_counts().to_dict()}


@app.get("/api/dataset/preview-by-class")
async def preview_by_class(sentiment: str, limit: int = 500):
    """Preview data ASLI (bukan yang sudah dibalancing) untuk satu kelas
    tertentu, maksimal `limit` baris, dipakai untuk membantu keputusan
    balancing sebelum diterapkan."""
    df = STATE["original_dataset"]
    if df is None:
        raise HTTPException(400, "Belum ada dataset yang diupload")

    subset = df[df["Sentiment"] == sentiment]
    total_available = len(subset)
    limited = subset.head(limit)

    return {
        "sentiment": sentiment,
        "total_available": total_available,
        "returned": len(limited),
        "data": limited.to_dict(orient="records"),
    }


class BalanceRequest(BaseModel):
    n_positive: int
    n_negative: int
    random_state: int = 42


@app.post("/api/dataset/balance")
async def balance_dataset(req: BalanceRequest):
    df = STATE["original_dataset"]
    if df is None:
        raise HTTPException(400, "Belum ada dataset yang diupload")

    pos_df = df[df["Sentiment"] == "Positive"]
    neg_df = df[df["Sentiment"] == "Negative"]

    if req.n_positive < 1 or req.n_negative < 1:
        raise HTTPException(400, "Jumlah data tiap kelas minimal 1")
    if req.n_positive > len(pos_df):
        raise HTTPException(400, f"Jumlah data Positive yang diminta ({req.n_positive}) melebihi data tersedia ({len(pos_df)})")
    if req.n_negative > len(neg_df):
        raise HTTPException(400, f"Jumlah data Negative yang diminta ({req.n_negative}) melebihi data tersedia ({len(neg_df)})")

    sampled_pos = pos_df.sample(n=req.n_positive, random_state=req.random_state)
    sampled_neg = neg_df.sample(n=req.n_negative, random_state=req.random_state)
    balanced = pd.concat([sampled_pos, sampled_neg]).sample(frac=1, random_state=req.random_state).reset_index(drop=True)

    STATE["dataset"] = balanced
    _reset_downstream_state()

    return {
        "message": "Balancing berhasil diterapkan",
        "total_rows": len(balanced),
        "distribusi_kelas": balanced["Sentiment"].value_counts().to_dict(),
    }


@app.post("/api/dataset/reset-balance")
async def reset_balance():
    df = STATE["original_dataset"]
    if df is None:
        raise HTTPException(400, "Belum ada dataset yang diupload")

    STATE["dataset"] = df.copy()
    _reset_downstream_state()

    return {"message": "Dataset dikembalikan ke data asli", "total_rows": len(df)}


# ================== PREPROCESSING ==================

@app.post("/api/preprocessing/run")
async def run_preprocessing():
    df = STATE["dataset"]
    if df is None:
        raise HTTPException(400, "Belum ada dataset yang diupload")

    results = []
    for idx, row in df.iterrows():
        pipeline_result = run_pipeline(str(row["Customer Review"]))
        pipeline_result["row_id"] = int(idx)
        pipeline_result["sentiment"] = row["Sentiment"]
        results.append(pipeline_result)

    STATE["preprocessed"] = results
    return {"message": "Preprocessing selesai", "total_rows": len(results)}


@app.get("/api/preprocessing/result/{row_id}")
async def get_preprocessing_result(row_id: int):
    results = STATE["preprocessed"]
    if results is None:
        raise HTTPException(400, "Preprocessing belum dijalankan")
    matched = [r for r in results if r["row_id"] == row_id]
    if not matched:
        raise HTTPException(404, "Baris data tidak ditemukan")
    return matched[0]


@app.get("/api/preprocessing/summary")
async def preprocessing_summary(page: int = 1, page_size: int = 20):
    results = STATE["preprocessed"]
    if results is None:
        raise HTTPException(400, "Preprocessing belum dijalankan")
    start, end = (page - 1) * page_size, page * page_size
    chunk = results[start:end]
    data = [
        {
            "row_id": r["row_id"],
            "raw_text": r["raw_text"],
            "clean_text": r["clean_text"],
            "sentiment": r["sentiment"],
            "unmapped_slang_words": r["unmapped_slang_words"],
            "antonym_substitutions": r["antonym_substitutions"],
        }
        for r in chunk
    ]
    return {"total_rows": len(results), "page": page, "page_size": page_size, "data": data}


@app.get("/api/preprocessing/unmapped-slang-summary")
async def unmapped_slang_summary(top_n: int = 30):
    results = STATE["preprocessed"]
    if results is None:
        raise HTTPException(400, "Preprocessing belum dijalankan")

    counter = Counter()
    docs_with_unmapped = 0
    for r in results:
        if r["unmapped_slang_words"]:
            docs_with_unmapped += 1
        counter.update(r["unmapped_slang_words"])

    top_unmapped = [{"word": w, "count": c} for w, c in counter.most_common(top_n)]
    return {
        "total_documents": len(results),
        "documents_with_unmapped_words": docs_with_unmapped,
        "total_unique_unmapped_words": len(counter),
        "top_unmapped_words": top_unmapped,
    }


# ================== PENCARIAN TEKS ==================

@app.get("/api/search")
async def search_text(query: str, metric: str = "cosine", k: int = 5):
    results = STATE["preprocessed"]
    if results is None:
        raise HTTPException(400, "Preprocessing belum dijalankan")
    if metric not in METRICS:
        raise HTTPException(400, f"Metrik harus salah satu dari: {', '.join(METRICS)}")

    query_lower = query.strip().lower()
    if not query_lower:
        raise HTTPException(400, "Kata kunci pencarian tidak boleh kosong")

    matched = [
        r for r in results
        if query_lower in r["raw_text"].lower() or query_lower in r["clean_text"].lower()
    ]

    model_ready = STATE["vectorizer"] is not None
    output = []

    for r in matched:
        item = {
            "row_id": r["row_id"],
            "raw_text": r["raw_text"],
            "clean_text": r["clean_text"],
            "dataset_sentiment": r["sentiment"],
            "predicted_sentiment": None,
        }

        if model_ready:
            vec = STATE["vectorizer"].transform([r["clean_text"]])
            dist = compute_distance(STATE["tfidf_matrix"], vec, metric)
            dist[0, r["row_id"]] = np.inf  # baris itu sendiri tidak boleh jadi tetangga
            pred = predict_from_ranking(rank_neighbors(dist), STATE["labels"], k, "Positive")
            item["predicted_sentiment"] = str(pred[0])
            item["prediction_matches_dataset"] = item["predicted_sentiment"] == item["dataset_sentiment"]

        output.append(item)

    return {
        "query": query,
        "total_matches": len(output),
        "model_ready": model_ready,
        "config": {"metric": metric, "k": k},
        "results": output,
    }


# ================== TF-IDF ==================

@app.post("/api/tfidf/extract")
async def extract_tfidf():
    results = STATE["preprocessed"]
    if results is None:
        raise HTTPException(400, "Preprocessing belum dijalankan")

    clean_texts = [r["clean_text"] for r in results]
    labels = np.array([r["sentiment"] for r in results])

    vectorizer, matrix = build_tfidf(clean_texts)
    STATE["vectorizer"] = vectorizer
    STATE["tfidf_matrix"] = matrix
    STATE["labels"] = labels

    return {"message": "Ekstraksi TF-IDF selesai", "total_documents": matrix.shape[0], "total_features": matrix.shape[1]}


@app.get("/api/tfidf/summary")
async def tfidf_summary(top_n: int = 20):
    if STATE["vectorizer"] is None:
        raise HTTPException(400, "TF-IDF belum diekstraksi")
    return get_summary(STATE["vectorizer"], STATE["tfidf_matrix"], top_n)


@app.get("/api/tfidf/document/{row_id}")
async def tfidf_document(row_id: int, top_n: int = 15):
    if STATE["vectorizer"] is None:
        raise HTTPException(400, "TF-IDF belum diekstraksi")
    if row_id >= STATE["tfidf_matrix"].shape[0]:
        raise HTTPException(404, "Baris data tidak ditemukan")
    return {"row_id": row_id, "weights": get_document_weights(STATE["vectorizer"], STATE["tfidf_matrix"], row_id, top_n)}


# ================== KLASIFIKASI ==================

class SingleRunRequest(BaseModel):
    metric: str
    k: int
    n_splits: int = 5
    positive_label: str = "Positive"


class ComparisonRequest(BaseModel):
    k_values: list[int] = [3, 5, 7, 9, 11]
    n_splits: int = 5
    positive_label: str = "Positive"


def _require_preprocessed():
    results = STATE["preprocessed"]
    if results is None:
        raise HTTPException(400, "Preprocessing belum dijalankan")
    clean_texts = [r["clean_text"] for r in results]
    labels = np.array([r["sentiment"] for r in results])
    return clean_texts, labels


def _validate_cv(n_splits: int, labels: np.ndarray, k_values: list[int]):
    if n_splits < 2:
        raise HTTPException(400, "Jumlah fold minimal 2")
    smallest_class = int(min(Counter(labels.tolist()).values()))
    if n_splits > smallest_class:
        raise HTTPException(400, f"Jumlah fold ({n_splits}) melebihi jumlah data kelas terkecil ({smallest_class})")
    if not k_values or any(k < 1 for k in k_values):
        raise HTTPException(400, "Nilai K harus bilangan bulat positif")
    if len(set(labels.tolist())) != 2:
        raise HTTPException(400, "Dataset harus memuat tepat dua kelas sentimen")


@app.post("/api/classify/single")
async def classify_single(req: SingleRunRequest):
    clean_texts, labels = _require_preprocessed()
    if req.metric not in METRICS:
        raise HTTPException(400, f"Metrik harus salah satu dari: {', '.join(METRICS)}")
    _validate_cv(req.n_splits, labels, [req.k])

    return run_single_scenario(clean_texts, labels, req.metric, req.k, req.n_splits, req.positive_label)


@app.post("/api/classify/compare")
async def classify_compare(req: ComparisonRequest):
    clean_texts, labels = _require_preprocessed()
    _validate_cv(req.n_splits, labels, req.k_values)

    result = run_full_comparison(clean_texts, labels, req.k_values, req.n_splits, req.positive_label)
    STATE["last_comparison"] = result
    return result


@app.get("/api/classify/last")
async def classify_last():
    if STATE["last_comparison"] is None:
        raise HTTPException(400, "Belum ada hasil Full Comparison. Jalankan dari halaman Eksperimen terlebih dahulu.")
    return STATE["last_comparison"]


# ================== PREDIKSI INTERAKTIF ==================

class PredictRequest(BaseModel):
    text: str
    k: int = 5


@app.post("/api/predict")
async def predict_text(req: PredictRequest):
    """
    Memprediksi satu ulasan dengan KETIGA metrik jarak sekaligus, supaya
    perbedaan perilaku Euclidean, Manhattan, dan Cosine terlihat langsung.
    Model memakai TF-IDF dari seluruh dataset (hasil ekstraksi di halaman TF-IDF).
    """
    if STATE["vectorizer"] is None:
        raise HTTPException(400, "Model belum siap, jalankan TF-IDF terlebih dahulu")
    if req.k < 1:
        raise HTTPException(400, "Nilai K minimal 1")

    pipeline_result = run_pipeline(req.text)
    test_vector = STATE["vectorizer"].transform([pipeline_result["clean_text"]])
    dataset_texts = STATE["preprocessed"]

    per_metric = []
    for metric in METRICS:
        distances = compute_distance(STATE["tfidf_matrix"], test_vector, metric)
        prediction = predict_from_ranking(rank_neighbors(distances), STATE["labels"], req.k, "Positive")
        idx, dists, labs = nearest_neighbors(distances[0], STATE["labels"], req.k)
        per_metric.append({
            "metric": metric,
            "label": METRIC_LABELS[metric],
            "predicted_sentiment": str(prediction[0]),
            "neighbors": [
                {
                    "row_id": int(i),
                    "clean_text": dataset_texts[int(i)]["clean_text"],
                    "sentiment": str(l),
                    "distance": round(float(d), 4),
                }
                for i, d, l in zip(idx, dists, labs)
            ],
        })

    return {
        "input_text": req.text,
        "stages": pipeline_result,
        "k": req.k,
        "predictions": per_metric,
        "all_agree": len({p["predicted_sentiment"] for p in per_metric}) == 1,
    }


# ================== EXPORT ==================

@app.get("/api/export/csv")
async def export_csv():
    if STATE["last_comparison"] is None:
        raise HTTPException(400, "Belum ada hasil Full Comparison untuk diexport")

    df = pd.DataFrame(STATE["last_comparison"]["results"]).drop(columns=["confusion_matrix", "labels_order", "folds"])
    stream = io.StringIO()
    df.to_csv(stream, index=False)
    stream.seek(0)
    return StreamingResponse(
        iter([stream.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=hasil_perbandingan_metrik_jarak.csv"},
    )


@app.get("/api/export/pdf")
async def export_pdf():
    if STATE["last_comparison"] is None:
        raise HTTPException(400, "Belum ada hasil Full Comparison untuk diexport")

    from reportlab.lib.pagesizes import A4
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib import colors

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = [
        Paragraph("Laporan Performa Metrik Jarak terhadap KNN", styles["Title"]),
        Paragraph(f"Stratified {STATE['last_comparison']['n_splits']}-Fold Cross-Validation. Nilai = rata-rata dari seluruh fold.", styles["Normal"]),
        Spacer(1, 12),
    ]

    results = STATE["last_comparison"]["results"]
    header = ["Metrik", "K", "Accuracy", "Precision", "Recall", "F1-Score", "F1 (std)"]
    rows = [header] + [
        [r["metric"].capitalize(), r["k"], r["accuracy"], r["precision"], r["recall"], r["f1_score"], r["f1_std"]]
        for r in results
    ]

    table = Table(rows)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563eb")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
    ]))
    elements.append(table)
    doc.build(elements)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=laporan_hasil_klasifikasi.pdf"},
    )


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
