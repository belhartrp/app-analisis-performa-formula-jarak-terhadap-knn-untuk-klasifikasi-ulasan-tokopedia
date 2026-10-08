"""
Modul preprocessing teks ulasan produk.
Implementasi 7 tahap sesuai Bab III Metodologi Penelitian:
1. Case Folding
2. Cleaning (mempertahankan tanda baca akhir klausa + normalisasi character lengthening)
3. Tokenization
4. Normalisasi Slang (memakai kamus_alay.csv jika tersedia)
5. Convert Negation (penanda NEG_ pada maksimal 4 kata atau sampai tanda baca)
6. Stopword Removal (mengecualikan kata 'ada' dalam scope negasi)
7. Stemming (Sastrawi)

Catatan: fungsi resolve_negation_antonyms (substitusi antonim) masih ada di
berkas ini tetapi SENGAJA DINONAKTIFKAN di run_pipeline, karena tidak termasuk
rancangan penelitian.
"""

import re
import csv
from pathlib import Path
from Sastrawi.Stemmer.StemmerFactory import StemmerFactory
from Sastrawi.StopWordRemover.StopWordRemoverFactory import StopWordRemoverFactory

_stemmer = StemmerFactory().create_stemmer()
_stopword_factory = StopWordRemoverFactory()
_stopwords = set(_stopword_factory.get_stop_words())

# NEGATION_WORDS = {"tidak", "bukan", "belum", "tanpa", "jangan", "kurang", "nggak", "ga", "gak"}
NEGATION_WORDS = {"tidak", "bukan", "belum", "tanpa", "jangan", "kurang", "nggak", "ga", "gak", "enggak"}
MAX_NEGATION_SCOPE = 4

_FALLBACK_SLANG_DICT = {
    "gak": "tidak", "ga": "tidak", "nggak": "tidak", "gk": "tidak",
    "bgt": "banget", "bgus": "bagus", "gpp": "tidak apa apa",
    "yg": "yang", "dgn": "dengan", "trs": "terus",
    "udh": "sudah", "udah": "sudah", "blm": "belum",
    "recomended": "direkomendasikan", "recommended": "direkomendasikan",
    "ok": "oke",
}

_FALLBACK_ANTONYM_DICT = {
    "rusak": "bagus", "jelek": "bagus", "buruk": "bagus", "cacat": "bagus",
    "kecewa": "puas", "lambat": "cepat", "lama": "cepat", "mahal": "murah",
    "susah": "mudah", "ribet": "mudah", "sulit": "mudah", "kotor": "bersih",
    "bocor": "bagus", "pecah": "bagus", "penyok": "bagus", "robek": "bagus",
    "mati": "hidup", "bau": "segar", "kasar": "halus", "palsu": "asli",
    "bohong": "jujur", "telat": "tepat", "lelet": "cepat", "hilang": "ada",
}

_POSSIBLE_HEADER_KEYS = {"slang", "informal", "alay", "kata_tidak_baku", "tidak_baku", "kata", "word", "antonim"}


def _load_dict_from_csv(filename: str, fallback: dict) -> dict:
    merged = dict(fallback)
    csv_path = Path(__file__).parent / filename

    if not csv_path.exists():
        print(f"[preprocessing_service] PERINGATAN: {filename} tidak ditemukan di {csv_path.parent}. "
              f"Hanya memakai kamus cadangan bawaan ({len(fallback)} kata).")
        return merged

    loaded_count = 0
    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        for i, row in enumerate(reader):
            if len(row) < 2:
                continue
            key_raw, val_raw = row[0].strip().lower(), row[1].strip().lower()
            if i == 0 and key_raw in _POSSIBLE_HEADER_KEYS:
                continue
            if key_raw and val_raw:
                merged[key_raw] = val_raw
                loaded_count += 1

    print(f"[preprocessing_service] Berhasil memuat {loaded_count} entri dari {filename} "
          f"(total kamus aktif: {len(merged)} kata).")
    return merged


SLANG_DICT = _load_dict_from_csv("kamus_alay.csv", _FALLBACK_SLANG_DICT)
ANTONYM_DICT = _load_dict_from_csv("kamus_antonim.csv", _FALLBACK_ANTONYM_DICT)


def case_folding(text: str) -> str:
    return text.lower()


def normalize_repeated_chars(text: str) -> str:
    return re.sub(r"(.)\1{2,}", r"\1", text)


def cleaning(text: str) -> str:
    text = re.sub(r"http\S+|www\S+", " ", text)
    text = re.sub(r"[^a-z0-9\s.,!?]", " ", text)
    text = normalize_repeated_chars(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def tokenization(text: str) -> list[str]:
    return [t for t in text.split() if t]


def normalize_slang(tokens: list[str]) -> tuple[list[str], list[str]]:
    result: list[str] = []
    unmapped_words: list[str] = []

    for tok in tokens:
        clean_tok = tok.strip(".,!?")
        punct = tok[len(clean_tok):] if len(tok) > len(clean_tok) else ""

        if not clean_tok:
            if punct and result:
                result[-1] = result[-1] + punct
            continue

        if clean_tok in SLANG_DICT:
            normalized = SLANG_DICT[clean_tok]
        else:
            normalized = clean_tok
            unmapped_words.append(clean_tok)

        parts = [p for p in normalized.split() if p]
        if not parts:
            continue

        result.extend(parts)
        if punct:
            result[-1] = result[-1] + punct

    return result, unmapped_words


def convert_negation(tokens: list[str]) -> list[str]:
    result = []
    i = 0
    while i < len(tokens):
        tok = tokens[i]
        base = tok.strip(".,!?")
        if not base:
            i += 1
            continue
        result.append(base)
        if base in NEGATION_WORDS:
            count = 0
            j = i + 1
            while j < len(tokens) and count < MAX_NEGATION_SCOPE:
                next_tok = tokens[j]
                next_base = next_tok.strip(".,!?")
                has_punct = bool(re.search(r"[.,!?]", next_tok))
                if next_base:
                    result.append(f"NEG_{next_base}")
                    count += 1
                j += 1
                if has_punct:
                    break
            i = j
            continue
        i += 1
    return result


def stopword_removal(tokens: list[str]) -> list[str]:
    result = []
    for tok in tokens:
        if tok.startswith("NEG_"):
            base = tok[4:]
            if base in _stopwords and base != "ada":
                continue
            result.append(tok)
        else:
            if tok in _stopwords:
                continue
            result.append(tok)
    return result


def stemming(tokens: list[str]) -> list[str]:
    result = []
    for tok in tokens:
        if tok.startswith("NEG_"):
            base = tok[4:]
            result.append(f"NEG_{_stemmer.stem(base)}")
        else:
            result.append(_stemmer.stem(tok))
    return result


def resolve_negation_antonyms(tokens: list[str]) -> tuple[list[str], list[str]]:
    """
    Tahap tambahan (perbaikan): kata hasil negasi (NEG_xxx) yang punya
    lawan kata di ANTONYM_DICT diganti langsung dengan lawan katanya
    (misal NEG_rusak -> "bagus"), supaya hasilnya memakai kata yang sudah
    lazim muncul di data latih. Kata NEG_ yang tidak ada di kamus antonim
    dibiarkan seperti semula (fallback ke perilaku lama).
    """
    result = []
    substitutions = []
    for tok in tokens:
        if tok.startswith("NEG_"):
            root = tok[4:]
            if root in ANTONYM_DICT:
                replacement = ANTONYM_DICT[root]
                result.append(replacement)
                substitutions.append(f"{tok}->{replacement}")
                continue
        result.append(tok)
    return result, substitutions


def run_pipeline(raw_text: str) -> dict:
    stage_case_folding = case_folding(raw_text)
    stage_cleaning = cleaning(stage_case_folding)
    stage_tokenization = tokenization(stage_cleaning)
    stage_slang, unmapped_words = normalize_slang(stage_tokenization)
    stage_negation = convert_negation(stage_slang)
    stage_stopword = stopword_removal(stage_negation)
    stage_stemming = stemming(stage_stopword)
    # stage_antonym, antonym_substitutions = resolve_negation_antonyms(stage_stemming)
    stage_antonym = stage_stemming
    antonym_substitutions = []

    return {
        "raw_text": raw_text,
        "case_folding": stage_case_folding,
        "cleaning": stage_cleaning,
        "tokenization": stage_tokenization,
        "normalize_slang": stage_slang,
        "unmapped_slang_words": unmapped_words,
        "convert_negation": stage_negation,
        "stopword_removal": stage_stopword,
        "stemming": stage_stemming,
        "antonym_substitutions": antonym_substitutions,
        "clean_text": " ".join(stage_antonym),
    }
