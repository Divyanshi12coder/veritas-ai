"""Record assets/gifs/analysis-walkthrough.gif: submit a sample on /analyze, then scroll the real report."""
import io
import sys
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parents[1] / "assets" / "gifs" / "analysis-walkthrough.gif"
WEB = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:5173"


def grab(page) -> Image.Image:
    return Image.open(io.BytesIO(page.screenshot())).convert("RGB").resize((960, 600), Image.LANCZOS)


with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge")
    page = b.new_page(viewport={"width": 1440, "height": 900})
    frames, durations = [], []
    page.goto(f"{WEB}/analyze", wait_until="networkidle")
    page.wait_for_timeout(800)
    frames.append(grab(page)); durations.append(1200)
    page.get_by_role("tab", name="Samples").click()
    page.wait_for_timeout(700)
    frames.append(grab(page)); durations.append(1200)
    page.get_by_role("button", name="Analyze this sample").first.click()
    page.get_by_text("ARTICLE VERDICT").first.wait_for(timeout=120000)  # report renders inline
    page.wait_for_timeout(1800)
    frames.append(grab(page)); durations.append(1800)
    base = page.evaluate("(() => { const e=[...document.querySelectorAll('*')].find(n=>n.textContent.trim()==='ARTICLE VERDICT' || n.textContent.trim().startsWith('ARTICLE VERDICT')); return e ? e.getBoundingClientRect().top + window.scrollY - 90 : 600; })()")
    for y in (base, base + 700, base + 1400, base + 2200, base + 3000):
        page.evaluate(f"window.scrollTo({{top: {y}, behavior: 'instant'}})")
        page.wait_for_timeout(1100)
        frames.append(grab(page)); durations.append(1400)
    b.close()

OUT.parent.mkdir(parents=True, exist_ok=True)
pal = [f.quantize(colors=128, method=Image.MEDIANCUT, dither=Image.NONE) for f in frames]
pal[0].save(OUT, save_all=True, append_images=pal[1:], duration=durations, loop=0, optimize=True)
print(OUT, OUT.stat().st_size // 1024, "KB,", len(frames), "frames")
