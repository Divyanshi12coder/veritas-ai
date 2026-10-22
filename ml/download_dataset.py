"""Download the training corpus (not redistributed with this repository).

    python ml/download_dataset.py            # -> data/raw/{train,validation,test}.parquet

Dataset: GonzaloA/fake_news on Hugging Face (https://huggingface.co/datasets/GonzaloA/fake_news).
Its dataset card lists the licence as "unknown", so the files are fetched on demand and git-ignored rather than bundled.
Large files are fetched with parallel ranged requests and resumed on failure, then validated as readable parquet.
"""
from __future__ import annotations

import argparse
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import httpx
import pyarrow.parquet as pq

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://huggingface.co/datasets/GonzaloA/fake_news/resolve/main/data/{split}-00000-of-00001.parquet"
CHUNK = 2 * 1024 * 1024


def _fetch_range(client: httpx.Client, url: str, start: int, end: int, retries: int = 12) -> bytes:
    for attempt in range(retries):
        try:
            r = client.get(url, headers={"Range": f"bytes={start}-{end}"}, timeout=60, follow_redirects=True)
            if r.status_code == 206 and len(r.content) == end - start + 1:
                return r.content
        except httpx.HTTPError:
            pass
        time.sleep(min(2 * (attempt + 1), 15))
    raise RuntimeError(f"range {start}-{end} failed after {retries} attempts")


def download(split: str, out_dir: Path, workers: int) -> None:
    dest = out_dir / f"{split}.parquet"
    if dest.exists():
        try:
            pq.read_table(dest)
            print(f"{split}: already present ({dest.stat().st_size / 1e6:.1f} MB)")
            return
        except Exception:  # noqa: BLE001
            dest.unlink()
    url = BASE.format(split=split)
    with httpx.Client() as client:
        head = client.get(url, headers={"Range": "bytes=0-0"}, follow_redirects=True, timeout=60)
        total = int(head.headers["content-range"].split("/")[-1])
        ranges = [(s, min(s + CHUNK - 1, total - 1)) for s in range(0, total, CHUNK)]
        parts: dict[int, bytes] = {}
        t0 = time.time()
        with ThreadPoolExecutor(max_workers=workers) as pool:
            futs = {pool.submit(_fetch_range, client, url, a, b): a for a, b in ranges}
            done = 0
            for fut, a in futs.items():
                parts[a] = fut.result()
                done += 1
                print(f"\r{split}: {done}/{len(ranges)} chunks ({time.time() - t0:.0f}s)", end="", flush=True)
    dest.write_bytes(b"".join(parts[a] for a, _ in ranges))
    rows = pq.read_table(dest).num_rows
    print(f"\n{split}: {rows} rows, {total / 1e6:.1f} MB")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out-dir", default=str(ROOT / "data" / "raw"))
    ap.add_argument("--workers", type=int, default=12)
    args = ap.parse_args()
    out = Path(args.out_dir)
    out.mkdir(parents=True, exist_ok=True)
    for split in ("train", "validation", "test"):
        download(split, out, args.workers)
    print("done. Next: python ml/train.py")


if __name__ == "__main__":
    sys.exit(main())
