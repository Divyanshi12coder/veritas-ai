import { ExternalLink } from 'lucide-react';
import { Badge } from '../ui/Badge';
import type { Tone } from '../ui/Badge';
import type { Assessment, ClaimResult } from '../../types/api';

const A: Record<Assessment, { label: string; tone: Tone }> = {
  supported: { label: 'Supported', tone: 'olive' },
  contradicted: { label: 'Contradicted', tone: 'red' },
  unverified: { label: 'Unverified', tone: 'ochre' },
  insufficient: { label: 'Insufficient evidence', tone: 'neutral' },
};

function ClaimCard({ c }: { c: ClaimResult }) {
  const a = A[c.assessment];
  return (
    <li className="rounded-lg border border-beige bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-beige bg-cream/60 px-4 py-3">
        <p className="min-w-0 flex-1 font-text text-base font-semibold text-wine [overflow-wrap:anywhere]">
          <span className="num mr-2 text-xs text-charcoal/50">#{c.id}</span>“{c.text}”
        </p>
        <div className="flex items-center gap-2">
          <Badge tone="neutral">{c.kind}</Badge>
          <Badge tone={a.tone}>{a.label}</Badge>
        </div>
      </div>
      <div className="space-y-3 px-4 py-3">
        <p className="text-sm"><span className="kicker mr-2">Assessment</span>{c.rationale} <span className="num text-xs text-charcoal/55">(confidence {(c.confidence * 100).toFixed(0)}%)</span></p>
        {c.evidence.length === 0 ? (
          <p className="rounded border border-dashed border-wine/25 px-3 py-2 text-sm text-charcoal/65">No sufficiently similar entries were found in the knowledge base.</p>
        ) : (
          <ul className="space-y-2">
            {c.evidence.map((e) => (
              <li key={e.kb_id} className="rounded-md border border-beige bg-paper px-3 py-2.5 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{e.title}</span>
                  <span className="flex items-center gap-2">
                    <Badge tone={e.relation === 'matches_known_false_claim' ? 'red' : 'olive'}>{e.relation === 'matches_known_false_claim' ? 'resembles known false claim' : 'matches statement'}</Badge>
                    <span className="num text-xs text-charcoal/60">sim {e.similarity.toFixed(2)}</span>
                  </span>
                </div>
                <p className="mt-1 text-charcoal/85">{e.statement}</p>
                <p className="mt-1 text-xs">
                  Source:{' '}
                  {e.source_url ? (
                    <a href={e.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-crimson hover:underline">{e.source_name}<ExternalLink className="h-3 w-3" aria-hidden /></a>
                  ) : <span>{e.source_name}</span>}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

export function ClaimsSection({ claims, modelLabel, p }: { claims: ClaimResult[]; modelLabel: string; p: number }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-wine/30 bg-wine px-4 py-3 text-cream">
          <p className="kicker !text-beige">Model prediction</p>
          <p className="mt-1 text-sm">{modelLabel} estimated P(fake) = <span className="num font-semibold">{(p * 100).toFixed(1)}%</span> for the article as a whole. It does not evaluate individual claims.</p>
        </div>
        <div className="rounded-md border border-ochre/50 bg-ochre/10 px-4 py-3">
          <p className="kicker !text-[#7a5516]">Retrieved evidence</p>
          <p className="mt-1 text-sm">From the project&apos;s curated knowledge base — verify independently. Absence of a match is not evidence that a claim is false.</p>
        </div>
      </div>
      {claims.length === 0 ? (
        <p className="text-sm text-charcoal/70">No check-worthy factual claims were extracted from this article.</p>
      ) : (
        <ul className="space-y-4">{claims.map((c) => <ClaimCard key={c.id} c={c} />)}</ul>
      )}
    </div>
  );
}
