import { FeatureChart } from '../charts/FeatureChart';
import { HighlightedText } from './HighlightedText';
import { Badge } from '../ui/Badge';
import type { AnalysisResponse } from '../../types/api';

export function ExplainSection({ a }: { a: AnalysisResponse }) {
  const e = a.explanation;
  return (
    <div className="space-y-8">
      <div className="rounded-md border-l-4 border-wine bg-cream px-4 py-3 text-sm">
        <p className="kicker">Method</p>
        <p className="font-medium">{e.method}</p>
        <p className="mt-1 text-charcoal/80">{e.note}</p>
      </div>

      <div>
        <h4 className="mb-3 text-lg font-bold">Features pushing toward FAKE vs REAL</h4>
        <FeatureChart fake={e.top_fake_features} real={e.top_real_features} />
      </div>

      <div>
        <h4 className="mb-1 text-lg font-bold">Article text with suspicious phrases marked</h4>
        <p className="mb-3 text-xs text-charcoal/65">{e.highlights.length} highlighted phrase{e.highlights.length === 1 ? '' : 's'}. Hover or focus a marked phrase for the reason.</p>
        <HighlightedText text={a.article.body} highlights={e.highlights} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h4 className="mb-2 text-lg font-bold">Keywords</h4>
          {e.keywords.length ? (
            <ul className="flex flex-wrap gap-1.5">
              {e.keywords.map((k) => <li key={k.term}><Badge tone="neutral" className="normal-case">{k.term} <span className="opacity-60">{k.score.toFixed(2)}</span></Badge></li>)}
            </ul>
          ) : <p className="text-sm text-charcoal/70">None extracted.</p>}
        </div>
        <div>
          <h4 className="mb-2 text-lg font-bold">Named entities</h4>
          {e.entities.length ? (
            <ul className="flex flex-wrap gap-1.5">
              {e.entities.map((n) => <li key={n.text + n.label}><Badge tone="wine" className="normal-case">{n.text} <span className="opacity-70">{n.label}{n.count > 1 ? ` ×${n.count}` : ''}</span></Badge></li>)}
            </ul>
          ) : <p className="text-sm text-charcoal/70">None detected.</p>}
        </div>
      </div>
    </div>
  );
}
