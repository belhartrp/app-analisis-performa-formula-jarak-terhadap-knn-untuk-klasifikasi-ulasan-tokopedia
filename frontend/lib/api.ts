import axios from "axios";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE,
});

export interface DatasetStats {
  total_rows: number;
  distribusi_kelas: Record<string, number>;
}

export interface PreprocessingRow {
  row_id: number;
  raw_text: string;
  clean_text: string;
  sentiment: string;
}

export interface PreprocessingStages {
  row_id: number;
  raw_text: string;
  case_folding: string;
  cleaning: string;
  tokenization: string[];
  normalize_slang: string[];
  convert_negation: string[];
  stopword_removal: string[];
  stemming: string[];
  clean_text: string;
  sentiment: string;
}

export interface TfidfSummary {
  total_documents: number;
  total_features: number;
  top_words: { word: string; avg_weight: number }[];
}

export const METRICS = ["euclidean", "manhattan", "cosine"] as const;
export type MetricName = (typeof METRICS)[number];

export const METRIC_LABEL: Record<string, string> = {
  euclidean: "Euclidean",
  manhattan: "Manhattan",
  cosine: "Cosine",
};

export const METRIC_COLOR: Record<string, string> = {
  euclidean: "#2563eb",
  manhattan: "#16a34a",
  cosine: "#dc2626",
};

export interface FoldResult {
  fold: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
}

export interface FoldSize {
  fold: number;
  train: number;
  test: number;
}

export interface ScenarioResult {
  metric: string;
  k: number;
  accuracy: number;
  accuracy_std: number;
  precision: number;
  precision_std: number;
  recall: number;
  recall_std: number;
  f1_score: number;
  f1_std: number;
  confusion_matrix: number[][];
  labels_order: string[];
  folds: FoldResult[];
  n_splits?: number;
  fold_sizes?: FoldSize[];
}

export interface BestPerMetric {
  metric: string;
  best_k: number;
  f1_score: number;
  f1_std: number;
  accuracy: number;
  mean_f1_over_k: number;
}

export interface ComparisonResult {
  n_splits: number;
  fold_sizes: FoldSize[];
  k_values: number[];
  results: ScenarioResult[];
  best_scenario: { metric: string; k: number; f1_score: number; f1_std: number };
  best_per_metric: BestPerMetric[];
}
