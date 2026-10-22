import { CheckCircle2, HelpCircle, XCircle } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { scoreColor } from '../../lib/format';
import type { SourceReport } from '../../types/api';

export function SourceSection({ s }: { s: SourceReport }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-serif text-xl font-bold text-wine">{s.name ?? s.domain ?? 'No source domain'}</span>
        {s.domain && s.name && <span className="num text-xs text-charcoal/60">{s.domain}</span>}
        <Badge tone="wine">{s.tier}</Badge>
        {s.available && s.score != null ? (
          <span className="num rounded border px-2 py-0.5 text-sm" style={{ color: scoreColor(s.score), borderColor: scoreColor(s.score) }}>{Math.round(s.score)}/100</span>
        ) : <Badge>Score unavailable</Badge>}
      </div>
      {!s.available && <p className="rounded border border-dashed border-wine/30 bg-cream px-3 py-2 text-sm text-charcoal/75">Source credibility could not be assessed (no recognizable domain). This factor is excluded from the credibility score.</p>}
      {s.checks.length > 0 && (
        <ul className="divide-y divide-beige rounded-md border border-beige">
          {s.checks.map((c) => (
            <li key={c.label} className="flex items-start gap-3 px-4 py-3">
              {c.passed === true ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-olive" aria-label="Passed" /> : c.passed === false ? <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-crimson" aria-label="Failed" /> : <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-ochre" aria-label="Unknown" />}
              <div><p className="text-sm font-semibold">{c.label}</p><p className="text-sm text-charcoal/75">{c.detail}</p></div>
            </li>
          ))}
        </ul>
      )}
      {s.notes.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm text-charcoal/80">{s.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
    </div>
  );
}
