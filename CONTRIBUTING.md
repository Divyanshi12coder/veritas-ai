# Contributing to Veritrace

Thanks for your interest. Veritrace is a decision-support tool for misinformation analysis, so changes are held to two standards: **they must work**, and **they must be honest** about what the system does and does not know.

## Setup

```bash
git clone <your-fork-url> && cd veritrace
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r backend/requirements-dev.txt
python ml/download_dataset.py && python ml/train.py     # only needed if you change features or models
cd frontend && npm install
```

## Before opening a pull request

| Check | Command |
|---|---|
| Backend tests | `cd backend && python -m pytest` |
| Frontend types + build | `cd frontend && npm run typecheck && npm run build` |
| Migrations match models | `cd backend && alembic upgrade head` on a clean database |

## Guidelines

- **No fabricated results.** Metrics in the UI and README come from `ml/artifacts/metrics.json`, produced by `ml/train.py`. Do not hand-edit numbers.
- **Label generated content.** Anything produced by a language model must be presented as generated commentary, never as verified evidence.
- **Keep the knowledge base auditable.** New entries in `data/kb/knowledge_base.json` need an attributable source organisation and a paraphrased, accurate statement.
- **Extend, don't bypass, the fallback chain.** Optional components (LLM, transformer, sentence-transformers) must degrade gracefully when unavailable.
- **Secrets stay in the environment.** Never commit keys; `.env` is git-ignored.
- Keep components small, typed and tested. Add a test with every behavioural change.

## Reporting issues

Please include the input (or a description of it), the model selected, and the observed vs. expected behaviour. For false positives/negatives on real news, those reports are especially valuable.
