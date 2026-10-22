"""Train and evaluate the classical Veritrace models.

    python ml/train.py                      # uses data/raw/{train,validation,test}.parquet
    python ml/train.py --data-dir data/raw --fake-label 0

Outputs (ml/artifacts/): one .joblib bundle per model + metrics.json (real, measured metrics).
Class convention: 1 = FAKE (positive class).
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from joblib import Parallel, delayed
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score, roc_curve
from sklearn.svm import LinearSVC

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.ml.classical import ClassicalModel  # noqa: E402
from app.nlp.features import STYLE_FEATURES, combine_title_body, extract_features  # noqa: E402
from app.nlp.preprocessing import tfidf_preprocessor  # noqa: E402

SEED = 42


def load_split(path: Path, fake_label: int) -> pd.DataFrame:
    df = pd.read_parquet(path) if path.suffix == ".parquet" else pd.read_csv(path)
    df = df.rename(columns={c: c.lower() for c in df.columns})
    df["title"] = df["title"].fillna("").astype(str)
    df["text"] = df["text"].fillna("").astype(str)
    df["y"] = (df["label"].astype(int) == fake_label).astype(int)
    df = df[df["text"].str.len() >= 200]
    df = df.drop_duplicates(subset="text")
    return df[["title", "text", "y"]].reset_index(drop=True)


def style_matrix(df: pd.DataFrame) -> np.ndarray:
    rows = Parallel(n_jobs=-1, batch_size=256)(delayed(extract_features)(t, b) for t, b in zip(df["title"], df["text"]))
    return np.asarray(rows, dtype=np.float64)


def metrics(y, prob, thr=0.5) -> dict:
    pred = (prob >= thr).astype(int)
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
    fpr, tpr, _ = roc_curve(y, prob)
    idx = np.unique(np.linspace(0, len(fpr) - 1, 60).astype(int))
    return {
        "accuracy": float(accuracy_score(y, pred)),
        "precision": float(precision_score(y, pred, zero_division=0)),
        "recall": float(recall_score(y, pred, zero_division=0)),
        "f1": float(f1_score(y, pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y, prob)),
        "confusion_matrix": [[int(tn), int(fp)], [int(fn), int(tp)]],
        "roc_curve": [[round(float(fpr[i]), 4), round(float(tpr[i]), 4)] for i in idx],
        "n_test": int(len(y)),
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-dir", default=str(ROOT / "data" / "raw"))
    ap.add_argument("--out-dir", default=str(ROOT / "ml" / "artifacts"))
    ap.add_argument("--fake-label", type=int, default=0, help="Integer label meaning FAKE in the source data")
    ap.add_argument("--max-train", type=int, default=0, help="Optional cap for quick experiments")
    args = ap.parse_args()

    d, out = Path(args.data_dir), Path(args.out_dir)
    out.mkdir(parents=True, exist_ok=True)
    ext = ".parquet" if (d / "train.parquet").exists() else ".csv"
    tr, va, te = (load_split(d / f"{s}{ext}", args.fake_label) for s in ("train", "validation", "test"))
    if args.max_train:
        tr = tr.sample(args.max_train, random_state=SEED).reset_index(drop=True)
    # remove cross-split duplicates so evaluation is not inflated by leakage
    seen = set(tr["text"])
    va = va[~va["text"].isin(seen)]
    seen |= set(va["text"])
    te = te[~te["text"].isin(seen)].reset_index(drop=True)
    va = va.reset_index(drop=True)
    print(f"train={len(tr)} val={len(va)} test={len(te)}  fake-rate train={tr.y.mean():.3f}")

    t0 = time.time()
    docs = lambda df: [combine_title_body(t, b) for t, b in zip(df["title"], df["text"])]  # noqa: E731
    vec = TfidfVectorizer(preprocessor=tfidf_preprocessor, ngram_range=(1, 2), min_df=3, max_df=0.9, max_features=60_000,
                          sublinear_tf=True, dtype=np.float32)
    Xtr, Xva, Xte = vec.fit_transform(docs(tr)), vec.transform(docs(va)), vec.transform(docs(te))
    print(f"tfidf fitted: {Xtr.shape} in {time.time() - t0:.0f}s")
    Str, Sva, Ste = style_matrix(tr), style_matrix(va), style_matrix(te)
    medians = np.median(Str, axis=0)
    print(f"style features: {Str.shape} in {time.time() - t0:.0f}s")

    results: dict[str, dict] = {}
    models: dict[str, ClassicalModel] = {}

    def record(key, label, family, clf, Xv, Xt, desc, coef=None, vectorizer=None):
        pv, pt = clf.predict_proba(Xv)[:, 1], clf.predict_proba(Xt)[:, 1]
        val_f1 = float(f1_score(va.y, (pv >= 0.5).astype(int)))
        val_auc = float(roc_auc_score(va.y, pv))
        results[key] = {"label": label, "family": family, "description": desc, "validation_f1": val_f1,
                        "validation_roc_auc": val_auc, "test": metrics(te.y.values, pt)}
        models[key] = ClassicalModel(key, label, family, clf, vectorizer=vectorizer, medians=medians, description=desc, coef=coef)
        print(f"{key:16s} val_f1={val_f1:.4f} val_auc={val_auc:.4f}  test_f1={results[key]['test']['f1']:.4f} test_auc={results[key]['test']['roc_auc']:.4f}")

    lr = LogisticRegression(C=8.0, max_iter=2000, solver="liblinear", random_state=SEED).fit(Xtr, tr.y)
    record("tfidf_lr", "TF-IDF + Logistic Regression", "tfidf", lr, Xva, Xte,
           "Word 1-2-gram TF-IDF (60k features) into L2-regularised logistic regression. Fully decomposable per-term explanations.",
           coef=lr.coef_[0].astype(np.float64), vectorizer=vec)

    svm = CalibratedClassifierCV(LinearSVC(C=0.6, random_state=SEED), cv=3, method="sigmoid").fit(Xtr, tr.y)
    svm_coef = np.mean([cc.estimator.coef_[0] for cc in svm.calibrated_classifiers_], axis=0)
    record("tfidf_svm", "TF-IDF + Linear SVM (calibrated)", "tfidf", svm, Xva, Xte,
           "Same TF-IDF features into a linear SVM with sigmoid probability calibration (3-fold).",
           coef=svm_coef.astype(np.float64), vectorizer=vec)

    rf = RandomForestClassifier(n_estimators=300, min_samples_leaf=3, n_jobs=-1, random_state=SEED).fit(Str, tr.y)
    record("stylometric_rf", "Stylometric Random Forest", "stylometric", rf, Sva, Ste,
           "300 trees on 33 linguistic features (style, sentiment, readability, sensational wording). Ignores topic vocabulary.")

    hgb = HistGradientBoostingClassifier(max_iter=300, learning_rate=0.06, random_state=SEED).fit(Str, tr.y)
    record("stylometric_hgb", "Stylometric Gradient Boosting", "stylometric", hgb, Sva, Ste,
           "Histogram gradient boosting on the same 33 linguistic features.")

    for key, m in models.items():
        joblib.dump(m, out / f"{key}.joblib", compress=3)

    tfidf_keys = [k for k, v in results.items() if v["family"] == "tfidf"]
    best = max(tfidf_keys, key=lambda k: results[k]["validation_roc_auc"])

    # global top terms from the logistic regression, for the model card
    names = vec.get_feature_names_out()
    order = np.argsort(models["tfidf_lr"].coef)
    top_real = [(names[i], round(float(models["tfidf_lr"].coef[i]), 3)) for i in order[:25]]
    top_fake = [(names[i], round(float(models["tfidf_lr"].coef[i]), 3)) for i in order[::-1][:25]]
    rf_imp = sorted(zip(STYLE_FEATURES, rf.feature_importances_), key=lambda kv: -kv[1])[:12]

    report = {
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "best_model": best,
        "dataset": {
            "name": "GonzaloA/fake_news (Hugging Face)",
            "url": "https://huggingface.co/datasets/GonzaloA/fake_news",
            "license_note": "Licence is listed as 'unknown' on the dataset card, so the data is NOT redistributed in this repo. "
                            "Run `python ml/download_dataset.py` to fetch it for local training.",
            "sizes": {"train": int(len(tr)), "validation": int(len(va)), "test": int(len(te))},
            "fake_rate": {"train": round(float(tr.y.mean()), 4), "test": round(float(te.y.mean()), 4)},
            "preprocessing": "HTML/URL stripping, unicode normalisation, agency dateline and boilerplate scrubbing, "
                             "de-duplication within and across splits, minimum 200 characters.",
        },
        "models": results,
        "top_terms": {"fake": top_fake, "real": top_real},
        "stylometric_importance": [[n, round(float(v), 4)] for n, v in rf_imp],
        "seed": SEED,
    }
    (out / "metrics.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"saved to {out}  best={best}  total {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
