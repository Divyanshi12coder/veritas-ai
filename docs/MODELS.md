# Models, training and the optional transformer

## Classical models (shipped)

Trained by [`ml/train.py`](../ml/train.py), serialised with joblib into `ml/artifacts/`, evaluated on a held-out test split; every metric lives in `ml/artifacts/metrics.json` and is surfaced at `GET /api/model-info`.

| Key | Estimator | Input | Why it is included |
|---|---|---|---|
| `tfidf_lr` | Logistic Regression | TF-IDF 1-2-grams | Strong baseline with an exact additive explanation |
| `tfidf_svm` | Linear SVM + sigmoid calibration | TF-IDF 1-2-grams | Margin-based comparison with calibrated probabilities |
| `stylometric_rf` | Random Forest | 33 style features | Topic-independent view; insulated from vocabulary and publisher names |
| `stylometric_hgb` | Histogram Gradient Boosting | 33 style features | Second topic-independent view |

Pipeline integrity: texts are cleaned and de-duplicated within and across splits (so test numbers are not inflated by leakage), agency datelines are scrubbed, the seed is fixed (42), and the test split is only used for the final report.

## Retraining

```bash
python ml/download_dataset.py     # data/raw/*.parquet (not redistributed; see README for licence note)
python ml/train.py                # ~15-20 minutes on a laptop CPU, dominated by TF-IDF over 24k long articles
python -m pytest backend          # consistency tests re-check metrics.json against its own confusion matrices
```

Artifacts are pickles of the pinned scikit-learn version (`requirements.txt`). Re-train after changing the feature set in `backend/app/nlp/features.py`; the stylometric models depend on the exact feature order.

To use your own data, provide `train/validation/test` files with `title`, `text`, `label` columns and pass `--data-dir` and `--fake-label` (the integer that means *fake*).

## Optional transformer

```bash
pip install transformers torch accelerate
python ml/train_transformer.py --epochs 1 --max-train 6000      # CPU smoke run; use a GPU and more data for real results
export TRANSFORMER_MODEL=ml/artifacts/transformer TRANSFORMER_FAKE_LABEL=LABEL_1
```

- Loaded lazily on first use, so API start-up stays fast.
- `POST /api/analyze` with `"model": "transformer"` (or `DEFAULT_MODEL=transformer`) uses it; if it cannot load, the response falls back to the best classical model and `verdict.note` says so.
- Explained by sentence occlusion: each sentence is removed in turn and the change in `P(fake)` is reported.
- The training script writes its own `transformer_metrics.json`; it is **not** part of the shipped metrics, and the UI never claims a transformer verdict unless the transformer produced it.

## Semantic retrieval (optional)

`EMBEDDING_BACKEND=sentence-transformers` (with `pip install sentence-transformers`) replaces the default TF-IDF vectors in the FAISS index with semantic embeddings, which helps paraphrased claims that share few words with the knowledge-base entries.
