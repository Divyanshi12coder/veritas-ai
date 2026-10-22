import { Accordion } from '../ui/Accordion';
import { Badge } from '../ui/Badge';
import { VerdictHeader } from './VerdictHeader';
import { SignalsSection } from './SignalsSection';
import { CredibilitySection } from './CredibilitySection';
import { ExplainSection } from './ExplainSection';
import { LinguisticsSection } from './LinguisticsSection';
import { SourceSection } from './SourceSection';
import { ClaimsSection } from './ClaimsSection';
import { LlmSection } from './LlmSection';
import { MODEL_LABELS } from '../../lib/format';
import type { AnalysisResponse } from '../../types/api';

function ModelsCompared({ a }: { a: AnalysisResponse }) {
  if (!a.models_compared.length) return <p className="text-sm text-charcoal/70">Only one model was available for this analysis.</p>;
  return (
    <div>
      <p className="mb-3 text-sm text-charcoal/75">Each available model's estimate of P(fake) for this same article. Disagreement between models is itself a signal of uncertainty.</p>
      <ul className="space-y-3">
        {a.models_compared.map((m) => (
          <li key={m.model_key}>
            <div className="flex justify-between text-sm"><span>{m.label || MODEL_LABELS[m.model_key] || m.model_key}{m.model_key === a.verdict.model_key && <Badge tone="wine" className="ml-2">used</Badge>}</span><span className="num">{(m.p_fake * 100).toFixed(1)}%</span></div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-sm bg-beige"><div className="h-full bg-crimson" style={{ width: `${Math.max(0, Math.min(100, m.p_fake * 100))}%` }} /></div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AnalysisReport({ a }: { a: AnalysisResponse }) {
  const sevCount = a.signals.filter((s) => s.severity === 'high' || s.severity === 'medium').length;
  return (
    <article className="space-y-5" aria-label="Analysis report">
      <VerdictHeader a={a} />
      <Accordion kicker="Section A" title="Model signals" defaultOpen meta={<Badge tone={sevCount ? 'ochre' : 'neutral'}>{a.signals.length} signals</Badge>}>
        <SignalsSection signals={a.signals} />
      </Accordion>
      <Accordion kicker="Section B" title="Credibility score breakdown" defaultOpen meta={<span className="num text-sm text-charcoal/70">{a.credibility.score}/100</span>}>
        <CredibilitySection c={a.credibility} />
      </Accordion>
      <Accordion kicker="Section C" title="Explainability" defaultOpen>
        <ExplainSection a={a} />
      </Accordion>
      <Accordion kicker="Section D" title="Linguistic profile">
        <LinguisticsSection l={a.linguistics} />
      </Accordion>
      <Accordion kicker="Section E" title="Source credibility">
        <SourceSection s={a.source} />
      </Accordion>
      <Accordion kicker="Section F" title="Claims, retrieved evidence and assessment" meta={<Badge>{a.claims.length} claims</Badge>}>
        <ClaimsSection claims={a.claims} modelLabel={a.verdict.model_label} p={a.verdict.p_fake} />
      </Accordion>
      <Accordion kicker="Section G" title="AI reasoning" meta={<Badge tone={a.llm.status === 'ok' ? 'wine' : 'neutral'}>{a.llm.status === 'ok' ? 'LLM' : 'Not used'}</Badge>}>
        <LlmSection llm={a.llm} />
      </Accordion>
      <Accordion kicker="Section H" title="Models compared">
        <ModelsCompared a={a} />
      </Accordion>
      <aside className="rule-double bg-cream px-5 py-4 text-xs leading-relaxed text-charcoal/80">
        <p className="kicker mb-1">Responsible AI</p>
        {a.disclaimer}
      </aside>
    </article>
  );
}
