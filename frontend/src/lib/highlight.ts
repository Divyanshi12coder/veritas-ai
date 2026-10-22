import type { Highlight } from '../types/api';

export interface Segment { text: string; highlight?: Highlight }

/** Split text into plain and highlighted segments (case-insensitive, non-overlapping, longest first). */
export function segmentText(text: string, highlights: Highlight[]): Segment[] {
  const lower = text.toLowerCase();
  const ranges: Array<{ s: number; e: number; h: Highlight }> = [];
  const uniq = [...new Map(highlights.filter((h) => h.text.trim().length > 1).map((h) => [h.text.toLowerCase(), h])).values()]
    .sort((a, b) => b.text.length - a.text.length);
  for (const h of uniq) {
    const needle = h.text.toLowerCase();
    let from = 0;
    for (let guard = 0; guard < 50; guard++) {
      const i = lower.indexOf(needle, from);
      if (i < 0) break;
      const e = i + needle.length;
      if (!ranges.some((r) => i < r.e && e > r.s)) ranges.push({ s: i, e, h });
      from = e;
    }
  }
  ranges.sort((a, b) => a.s - b.s);
  const out: Segment[] = [];
  let pos = 0;
  for (const r of ranges) {
    if (r.s > pos) out.push({ text: text.slice(pos, r.s) });
    out.push({ text: text.slice(r.s, r.e), highlight: r.h });
    pos = r.e;
  }
  if (pos < text.length) out.push({ text: text.slice(pos) });
  return out;
}
