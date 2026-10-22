"""Render evaluation figures for the README from ml/artifacts/metrics.json (real, measured values only)."""
from __future__ import annotations

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "diagrams"
INK, WINE, CRIMSON, RED, BEIGE, CREAM = "#2A2326", "#4A1220", "#9E2A3A", "#8B1E2D", "#E8DCC8", "#F6EFE3"
COLORS = {"tfidf_lr": WINE, "tfidf_svm": RED, "stylometric_rf": "#B8860B", "stylometric_hgb": "#8A7F72"}

plt.rcParams.update({"font.family": "serif", "axes.edgecolor": INK, "axes.labelcolor": INK, "xtick.color": INK, "ytick.color": INK,
                     "figure.facecolor": CREAM, "axes.facecolor": "#FBF8F3", "axes.spines.top": False, "axes.spines.right": False})


def main() -> None:
    m = json.loads((ROOT / "ml" / "artifacts" / "metrics.json").read_text())
    models = m["models"]
    OUT.mkdir(parents=True, exist_ok=True)

    fig, ax = plt.subplots(figsize=(6.2, 5))
    for k, r in models.items():
        fpr, tpr = zip(*r["test"]["roc_curve"])
        ax.plot(fpr, tpr, color=COLORS.get(k, INK), lw=2, label=f"{r['label']} (AUC {r['test']['roc_auc']:.3f})")
    ax.plot([0, 1], [0, 1], ls="--", color=CRIMSON, lw=1)
    ax.set_xlabel("False positive rate"); ax.set_ylabel("True positive rate"); ax.set_title("ROC curves, held-out test split", color=WINE, fontweight="bold")
    ax.legend(loc="lower right", fontsize=8, frameon=False)
    fig.tight_layout(); fig.savefig(OUT / "roc-curves.png", dpi=160); plt.close(fig)

    best = models[m["best_model"]]
    cm = np.array(best["test"]["confusion_matrix"])
    fig, ax = plt.subplots(figsize=(4.6, 4.2))
    ax.imshow(cm, cmap=matplotlib.colors.LinearSegmentedColormap.from_list("w", [CREAM, CRIMSON, WINE]))
    for (i, j), v in np.ndenumerate(cm):
        ax.text(j, i, f"{v:,}", ha="center", va="center", color="white" if v > cm.max() / 2 else INK, fontsize=14, fontweight="bold")
    ax.set_xticks([0, 1], ["Predicted real", "Predicted fake"]); ax.set_yticks([0, 1], ["Actually real", "Actually fake"])
    ax.set_title(f"Confusion matrix: {best['label']}", color=WINE, fontsize=10, fontweight="bold")
    for s in ax.spines.values():
        s.set_visible(False)
    fig.tight_layout(); fig.savefig(OUT / "confusion-matrix.png", dpi=160); plt.close(fig)

    names = list(models)
    metrics = ["accuracy", "precision", "recall", "f1", "roc_auc"]
    x = np.arange(len(metrics)); w = 0.8 / len(names)
    fig, ax = plt.subplots(figsize=(8.4, 4.4))
    for i, k in enumerate(names):
        vals = [models[k]["test"][mm] for mm in metrics]
        ax.bar(x + i * w - 0.4 + w / 2, vals, w, color=COLORS.get(k, INK), label=models[k]["label"])
    ax.set_xticks(x, ["Accuracy", "Precision", "Recall", "F1", "ROC-AUC"]); lo = min(models[k]["test"][mm] for k in names for mm in metrics)
    ax.set_ylim(max(0, lo - 0.05), 1.0); ax.set_title("Test-set metrics by model", color=WINE, fontweight="bold")
    ax.legend(fontsize=8, frameon=False, loc="lower right")
    fig.tight_layout(); fig.savefig(OUT / "model-comparison.png", dpi=160); plt.close(fig)
    print("figures written to", OUT)


if __name__ == "__main__":
    main()
