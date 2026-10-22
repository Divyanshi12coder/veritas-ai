"""Optional: fine-tune DistilBERT for fake-news classification and evaluate it on the same held-out test split.

    pip install transformers torch accelerate
    python ml/train_transformer.py --epochs 1 --max-train 6000          # CPU-friendly smoke run
    python ml/train_transformer.py --epochs 2 --model distilbert-base-uncased --max-length 256   # GPU recommended

Writes the model to ml/artifacts/transformer/ together with transformer_metrics.json. Enable it in the app with:
    TRANSFORMER_MODEL=ml/artifacts/transformer     TRANSFORMER_FAKE_LABEL=LABEL_1

Class convention: label 1 == FAKE. This script is NOT run as part of the default setup; the app works without it and the
UI always states which model produced a prediction.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT / "ml"))

from app.nlp.features import combine_title_body  # noqa: E402
from app.nlp.preprocessing import clean_text  # noqa: E402
from train import load_split, metrics  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="distilbert-base-uncased")
    ap.add_argument("--epochs", type=int, default=1)
    ap.add_argument("--max-length", type=int, default=256)
    ap.add_argument("--max-train", type=int, default=6000)
    ap.add_argument("--batch-size", type=int, default=16)
    ap.add_argument("--fake-label", type=int, default=0)
    args = ap.parse_args()

    import torch
    from transformers import AutoModelForSequenceClassification, AutoTokenizer, Trainer, TrainingArguments

    raw = ROOT / "data" / "raw"
    tr, va, te = (load_split(raw / f"{s}.parquet", args.fake_label) for s in ("train", "validation", "test"))
    tr = tr.sample(min(args.max_train, len(tr)), random_state=42)
    te = te[~te["text"].isin(set(tr["text"]) | set(va["text"]))]
    tok = AutoTokenizer.from_pretrained(args.model)

    class DS(torch.utils.data.Dataset):
        def __init__(self, df):
            texts = [clean_text(combine_title_body(t, b)) for t, b in zip(df["title"], df["text"])]
            self.enc = tok(texts, truncation=True, max_length=args.max_length, padding="max_length")
            self.y = df["y"].tolist()

        def __len__(self):
            return len(self.y)

        def __getitem__(self, i):
            item = {k: torch.tensor(v[i]) for k, v in self.enc.items()}
            item["labels"] = torch.tensor(self.y[i])
            return item

    model = AutoModelForSequenceClassification.from_pretrained(args.model, num_labels=2)
    out = ROOT / "ml" / "artifacts" / "transformer"
    targs = TrainingArguments(output_dir=str(out / "runs"), num_train_epochs=args.epochs, per_device_train_batch_size=args.batch_size,
                              per_device_eval_batch_size=32, learning_rate=3e-5, weight_decay=0.01, logging_steps=50,
                              save_strategy="no", report_to=[], seed=42)
    trainer = Trainer(model=model, args=targs, train_dataset=DS(tr))
    trainer.train()
    pred = trainer.predict(DS(te))
    logits = pred.predictions
    probs = np.exp(logits - logits.max(1, keepdims=True))
    probs = probs[:, 1] / probs.sum(1)
    report = {"base_model": args.model, "train_size": int(len(tr)), "epochs": args.epochs, "max_length": args.max_length, "test": metrics(te["y"].values, probs)}
    trainer.save_model(str(out))
    tok.save_pretrained(str(out))
    (out / "transformer_metrics.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report["test"], indent=2))


if __name__ == "__main__":
    main()
