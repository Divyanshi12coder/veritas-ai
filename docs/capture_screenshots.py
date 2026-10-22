"""Capture README screenshots from the running app (real UI, real analyses).

Prereqs: backend on :8000, frontend on :5173 (npm run dev) or a preview build, `pip install playwright`, and either
`playwright install chromium` or an installed Microsoft Edge/Chrome (use --channel msedge|chrome).

    python docs/capture_screenshots.py --channel msedge
"""
from __future__ import annotations

import argparse
import json
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "screenshots"


def api(base: str, path: str, payload: dict | None = None):
    req = urllib.request.Request(f"{base}{path}", data=json.dumps(payload).encode() if payload else None,
                                 headers={"content-type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--web", default="http://localhost:5173")
    ap.add_argument("--api", default="http://localhost:8000")
    ap.add_argument("--channel", default=None)
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)

    samples = {s["id"]: s for s in api(args.api, "/api/samples")}
    ids = {}
    for sid in ("cancer-cure", "council-budget", "5g-virus", "sea-level-science", "vaccine-explainer", "budget-opinion"):
        s = samples[sid]
        ids[sid] = api(args.api, "/api/analyze", {"title": s["title"], "body": s["body"], "author": s["author"], "source_url": s["source_url"], "use_llm": False})["id"]

    shots = [
        ("hero", "/", 1440, 900, False),
        ("analyzer", "/analyze", 1440, 900, False),
        ("report-misinformation", f"/analysis/{ids['cancer-cure']}", 1440, 900, True),
        ("report-reliable", f"/analysis/{ids['sea-level-science']}", 1440, 900, True),
        ("dashboard", "/dashboard", 1440, 900, True),
        ("models", "/models", 1440, 900, True),
        ("mobile-hero", "/", 390, 844, False),
    ]
    with sync_playwright() as p:
        browser = p.chromium.launch(channel=args.channel) if args.channel else p.chromium.launch()
        for name, route, w, h, full in shots:
            page = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
            errors: list[str] = []
            page.on("console", lambda m, e=errors: e.append(m.text) if m.type == "error" else None)
            page.goto(args.web + route, wait_until="networkidle")
            page.wait_for_timeout(1500)
            if full:  # scroll through so scroll-triggered animations (bars, charts) fire before the full-page capture
                height = page.evaluate("document.body.scrollHeight")
                for y in range(0, height, 500):
                    page.evaluate(f"window.scrollTo(0, {y})")
                    page.wait_for_timeout(250)
                page.evaluate("window.scrollTo(0, 0)")
            page.wait_for_timeout(1800)  # let count-up / chart animations settle
            page.screenshot(path=str(OUT / f"{name}.png"), full_page=full)
            print(f"{name}: saved" + (f"  console errors: {errors}" if errors else ""))
            page.close()
        browser.close()


if __name__ == "__main__":
    main()
