import { Cpu, ExternalLink, Info } from 'lucide-react';
import { Dial } from '../ui/Dial';
import { Badge } from '../ui/Badge';
import { LABEL_COLOR, fmtDate, pct } from '../../lib/format';
import type { AnalysisResponse } from '../../types/api';

const VERDICT_TEXT = {
  likely_misinformation: 'LIKELY MISINFORMATION',
  uncertain: 'UNCERTAIN — MIXED SIGNALS',
  likely_reliable: 'LIKELY RELIABLE',
} as const;

export function VerdictHeader({ a }: { a: AnalysisResponse }) {
  const { verdict: v, credibility: c, article } = a;
  const color = LABEL_COLOR[v.label];
  return (
    <header className="rounded-lg border border-beige bg-white shadow-clip">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-double border-wine/70 px-5 py-2.5 sm:px-8">
        <span className="kicker">Article verdict · Case file {a.id.slice(0, 8)}</span>
        <span className="font-mono text-[11px] tracking-wider text-charcoal/60">{fmtDate(a.created_at)} · {a.duration_ms} ms</span>
      </div>
      <div className="grid gap-8 p-5 sm:p-8 md:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <p className="font-text text-lg italic text-charcoal/80 [overflow-wrap:anywhere]">“{article.title}”</p>
          <p className="mt-1 text-xs text-charcoal/60">
            {[article.author, article.domain, article.published_at, `${article.word_count} words`].filter(Boolean).join(' · ')}
            {article.source_url && (
              <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 text-crimson hover:underline">
                source <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            )}
          </p>
          <h2 className="mt-5 text-3xl font-extrabold leading-tight sm:text-5xl" style={{ color }}>{VERDICT_TEXT[v.label]}</h2>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="num rounded border px-3 py-1 text-sm font-medium" style={{ borderColor: color, color }}>
              Confidence {pct(v.confidence)}
            </span>
            <span className="num text-sm text-charcoal/70">P(fake) {pct(v.p_fake, 1)}</span>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2 rounded-md border border-wine/20 bg-cream px-3 py-2.5">
            <Cpu className="h-4 w-4 text-crimson" aria-hidden />
            <span className="text-sm">Prediction by <strong>{v.model_label}</strong></span>
            <Badge tone="wine">{v.model_kind}</Badge>
          </div>
          {v.note && (
            <p className="mt-3 flex gap-2 rounded-md border-l-4 border-ochre bg-ochre/10 px-3 py-2 text-sm">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-ochre" aria-hidden />
              <span>{v.note}</span>
            </p>
          )}
        </div>
        <div className="text-center">
          <Dial value={c.score} label="Credibility" sub={c.band} size={190} />
          <p className="mt-1 font-serif text-lg font-bold text-wine">{c.band}</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-charcoal/50">score / 100</p>
        </div>
      </div>
    </header>
  );
}
