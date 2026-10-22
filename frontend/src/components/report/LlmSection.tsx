import type { ReactNode } from 'react';
import { Bot, Sparkles } from 'lucide-react';
import { Badge, severityTone } from '../ui/Badge';
import type { LLMAnalysis } from '../../types/api';

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-beige bg-paper p-4">
      <p className="kicker">{title}</p>
      <div className="mt-1.5 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

export function LlmSection({ llm }: { llm: LLMAnalysis }) {
  if (llm.status !== 'ok') {
    return (
      <div className="flex gap-3 rounded-md border border-dashed border-wine/30 bg-cream px-4 py-4 text-sm">
        <Bot className="mt-0.5 h-5 w-5 shrink-0 text-wine" aria-hidden />
        <div>
          <p className="font-semibold">{llm.status === 'disabled' ? 'LLM reasoning was not used for this analysis.' : 'LLM reasoning was unavailable for this analysis.'}</p>
          {llm.message && <p className="mt-1 text-charcoal/80">{llm.message}</p>}
          <p className="mt-1 text-charcoal/70">Everything else in this report comes from the local pipeline (classifier, linguistic features, source checks and evidence retrieval) and is unaffected.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="wine"><Sparkles className="h-3 w-3" aria-hidden />AI-generated narrative</Badge>
        {llm.provider && <span className="num text-xs text-charcoal/60">{llm.provider}{llm.model ? ` · ${llm.model}` : ''}</span>}
      </div>
      <p className="rounded-md border-l-4 border-ochre bg-ochre/10 px-4 py-3 text-sm font-medium">{llm.disclaimer}</p>
      {llm.summary && <Block title="Summary"><p className="font-text text-base">{llm.summary}</p></Block>}
      {llm.red_flags.length > 0 && (
        <Block title="Red flags">
          <ul className="space-y-3">
            {llm.red_flags.map((r, i) => (
              <li key={i} className="border-b border-beige pb-3 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2"><Badge tone={severityTone(r.severity)}>{r.severity}</Badge><strong>{r.category}</strong></div>
                <p className="mt-1">{r.description}</p>
                {r.quote && <blockquote className="mt-1 border-l-2 border-crimson pl-3 font-text italic text-charcoal/80">“{r.quote}”</blockquote>}
              </li>
            ))}
          </ul>
        </Block>
      )}
      {llm.missing_context.length > 0 && <Block title="Missing context"><ul className="list-disc space-y-1 pl-5">{llm.missing_context.map((m, i) => <li key={i}>{m}</li>)}</ul></Block>}
      {llm.claims_review.length > 0 && (
        <Block title="Claims review">
          <ul className="space-y-3">{llm.claims_review.map((c, i) => (
            <li key={i}><p className="font-semibold">“{c.claim}”</p><p><Badge>{c.assessment}</Badge></p><p className="mt-1 text-charcoal/80">{c.reasoning}</p></li>
          ))}</ul>
        </Block>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {llm.evidence_quality && <Block title="Evidence quality">{llm.evidence_quality}</Block>}
        {llm.uncertainty && <Block title="Uncertainty">{llm.uncertainty}</Block>}
      </div>
    </div>
  );
}
