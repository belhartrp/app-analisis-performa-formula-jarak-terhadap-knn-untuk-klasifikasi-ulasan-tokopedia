"""
Modul klasifikasi sentimen: K-Nearest Neighbor (KNN, voting mayoritas biasa)
dengan tiga metrik jarak: Euclidean, Manhattan, dan Cosine.

Desain pengujian (sesuai Bab I dan Bab III):
- Algoritma tetap (KNN); satu-satunya faktor yang diubah adalah metrik jarak.
- Evaluasi memakai Stratified 5-Fold Cross-Validation.
- TF-IDF (tanpa normalisasi L2) di-fit HANYA pada data latih tiap fold, lalu
  dipakai untuk mentransformasi data uji fold tersebut (mencegah data leakage).
- Setiap skenario (metrik x K) dievaluasi pada pembagian fold yang identik.
"""

import numpy as np
from sklearn.model_selection import StratifiedKFold
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import (
    confusion_matrix,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
)
from sklearn.metrics.pairwise import (
    euclidean_distances,
    manhattan_distances,
    cosine_distances,
)

METRICS = ("euclidean", "manhattan", "cosine")
METRIC_LABELS = {"euclidean": "Euclidean", "manhattan": "Manhattan", "cosine": "Cosine"}


def compute_distance(train_matrix, test_matrix, metric: str) -> np.ndarray:
    """Matriks jarak (n_test, n_train) antara data uji dan data latih."""
    if metric == "euclidean":
        return euclidean_distances(test_matrix, train_matrix)
    elif metric == "manhattan":
        return manhattan_distances(test_matrix, train_matrix)
    elif metric == "cosine":
        return cosine_distances(test_matrix, train_matrix)
    raise ValueError(f"Metrik tidak dikenal: {metric}")


def rank_neighbors(distances: np.ndarray) -> np.ndarray:
    """
    Urutan indeks tetangga dari yang terdekat untuk tiap baris data uji.
    Memakai stable sort agar hasil deterministik saat ada jarak yang sama.
    """
    return np.argsort(distances, axis=1, kind="stable")


def predict_from_ranking(order: np.ndarray, train_labels: np.ndarray, k: int, positive_label: str):
    """
    Voting mayoritas biasa (KNN) dari k tetangga terdekat.
    Jika suara seri (hanya mungkin untuk K genap), kelas tetangga terdekat dipakai.
    Mengembalikan array label prediksi.
    """
    classes = np.unique(train_labels)
    if len(classes) != 2 or positive_label not in classes:
        raise ValueError("Data latih harus berisi dua kelas dan memuat label positif.")
    negative_label = classes[classes != positive_label][0]

    is_pos = (train_labels == positive_label)
    top = order[:, :k]
    votes_pos = is_pos[top].sum(axis=1)
    pred_pos = np.where(votes_pos * 2 == k, is_pos[top[:, 0]], votes_pos * 2 > k)
    return np.where(pred_pos, positive_label, negative_label)


def evaluate(y_true, y_pred, positive_label: str, labels_order: list[str]) -> dict:
    cm = confusion_matrix(y_true, y_pred, labels=labels_order)
    return {
        "confusion_matrix": cm,
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(precision_score(y_true, y_pred, pos_label=positive_label, average="binary", zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, pos_label=positive_label, average="binary", zero_division=0)),
        "f1_score": float(f1_score(y_true, y_pred, pos_label=positive_label, average="binary", zero_division=0)),
    }


def cross_validate(
    clean_texts: list[str],
    labels: np.ndarray,
    metrics: list[str],
    k_values: list[int],
    n_splits: int = 5,
    positive_label: str = "Positive",
    random_state: int = 42,
) -> dict:
    """
    Stratified K-Fold Cross-Validation untuk semua kombinasi (metrik x K).

    Mengembalikan, untuk setiap kombinasi: rata-rata dan simpangan baku
    Accuracy/Precision/Recall/F1 dari seluruh fold, hasil tiap fold, dan
    confusion matrix gabungan (jumlah dari seluruh fold).
    """
    texts = np.asarray(clean_texts, dtype=object)
    labels = np.asarray(labels)
    labels_order = sorted(set(labels.tolist()))

    skf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=random_state)

    # per_fold[(metric, k)] -> list of dict hasil per fold
    per_fold: dict[tuple[str, int], list[dict]] = {(m, k): [] for m in metrics for k in k_values}
    fold_sizes = []

    for fold_no, (train_idx, test_idx) in enumerate(skf.split(texts, labels), start=1):
        vectorizer = TfidfVectorizer(norm=None)  # tanpa normalisasi L2
        train_matrix = vectorizer.fit_transform(texts[train_idx])
        test_matrix = vectorizer.transform(texts[test_idx])
        train_labels, test_labels = labels[train_idx], labels[test_idx]
        fold_sizes.append({"fold": fold_no, "train": int(len(train_idx)), "test": int(len(test_idx))})

        for metric in metrics:
            distances = compute_distance(train_matrix, test_matrix, metric)
            order = rank_neighbors(distances)
            for k in k_values:
                preds = predict_from_ranking(order, train_labels, k, positive_label)
                res = evaluate(test_labels, preds, positive_label, labels_order)
                res["fold"] = fold_no
                per_fold[(metric, k)].append(res)

    results = []
    for (metric, k), folds in per_fold.items():
        def mean_std(key):
            arr = np.array([f[key] for f in folds])
            return float(arr.mean()), float(arr.std(ddof=1)) if len(arr) > 1 else 0.0

        acc_m, acc_s = mean_std("accuracy")
        pre_m, pre_s = mean_std("precision")
        rec_m, rec_s = mean_std("recall")
        f1_m, f1_s = mean_std("f1_score")
        cm_total = np.sum([f["confusion_matrix"] for f in folds], axis=0)

        results.append({
            "metric": metric,
            "k": k,
            "accuracy": round(acc_m, 4), "accuracy_std": round(acc_s, 4),
            "precision": round(pre_m, 4), "precision_std": round(pre_s, 4),
            "recall": round(rec_m, 4), "recall_std": round(rec_s, 4),
            "f1_score": round(f1_m, 4), "f1_std": round(f1_s, 4),
            "confusion_matrix": cm_total.tolist(),
            "labels_order": labels_order,
            "folds": [
                {
                    "fold": f["fold"],
                    "accuracy": round(f["accuracy"], 4),
                    "precision": round(f["precision"], 4),
                    "recall": round(f["recall"], 4),
                    "f1_score": round(f["f1_score"], 4),
                }
                for f in folds
            ],
        })

    return {"n_splits": n_splits, "fold_sizes": fold_sizes, "results": results}


def run_single_scenario(
    clean_texts: list[str], labels: np.ndarray, metric: str, k: int,
    n_splits: int = 5, positive_label: str = "Positive",
) -> dict:
    """Satu skenario (KNN + satu metrik + satu nilai K), dievaluasi dengan Stratified K-Fold."""
    cv = cross_validate(clean_texts, labels, [metric], [k], n_splits, positive_label)
    out = cv["results"][0]
    out["n_splits"] = n_splits
    out["fold_sizes"] = cv["fold_sizes"]
    return out


def run_full_comparison(
    clean_texts: list[str], labels: np.ndarray, k_values: list[int],
    n_splits: int = 5, positive_label: str = "Positive",
) -> dict:
    """
    Menjalankan ketiga skenario (KNN-Euclidean, KNN-Manhattan, KNN-Cosine)
    untuk setiap nilai K, pada pembagian fold yang identik.
    """
    cv = cross_validate(clean_texts, labels, list(METRICS), k_values, n_splits, positive_label)
    results = cv["results"]

    best = max(results, key=lambda r: r["f1_score"])

    best_per_metric = []
    for metric in METRICS:
        rows = [r for r in results if r["metric"] == metric]
        top = max(rows, key=lambda r: r["f1_score"])
        best_per_metric.append({
            "metric": metric,
            "best_k": top["k"],
            "f1_score": top["f1_score"],
            "f1_std": top["f1_std"],
            "accuracy": top["accuracy"],
            "mean_f1_over_k": round(float(np.mean([r["f1_score"] for r in rows])), 4),
        })

    return {
        "n_splits": cv["n_splits"],
        "fold_sizes": cv["fold_sizes"],
        "k_values": k_values,
        "results": results,
        "best_scenario": {
            "metric": best["metric"],
            "k": best["k"],
            "f1_score": best["f1_score"],
            "f1_std": best["f1_std"],
        },
        "best_per_metric": best_per_metric,
    }


def nearest_neighbors(distances_row: np.ndarray, train_labels: np.ndarray, k: int, top_n: int | None = None):
    """Indeks, jarak, dan label k tetangga terdekat untuk satu data uji (dipakai demo)."""
    order = np.argsort(distances_row, kind="stable")[: (top_n or k)]
    return order, distances_row[order], train_labels[order]
