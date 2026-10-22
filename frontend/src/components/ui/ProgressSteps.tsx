import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { cx } from '../../lib/format';

const STEPS = [
  'Cleaning and parsing the article',
  'Extracting linguistic features',
  'Running the classifier',
  'Checking source credibility',
  'Retrieving evidence from the knowledge base',
  'Composing the explanation',
];

/**
 * Indeterminate stepper: it cycles a highlight through the pipeline stages while the
 * request is in flight. It never shows a percentage and never claims a stage is "done"
 * beyond the visual cursor; the real result replaces it when the response arrives.
 */
export function ProgressSteps({ steps = STEPS }: { steps?: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(x + 1, steps.length - 1)), 1400);
    return () => clearInterval(t);
  }, [steps.length]);
  return (
    <div role="status" aria-live="polite" className="rounded-lg border border-beige bg-white p-6 shadow-card">
      <p className="kicker">Analysis in progress</p>
      <p className="mt-1 font-serif text-2xl font-bold text-wine">The desk is reviewing your article…</p>
      <div className="relative mt-4 h-1 overflow-hidden rounded bg-beige">
        <div className="absolute inset-y-0 w-1/3 animate-sweep rounded bg-crimson" />
      </div>
      <ol className="mt-5 space-y-2.5">
        {steps.map((s, idx) => (
          <li key={s} className={cx('flex items-center gap-3 text-sm transition-opacity', idx > i ? 'opacity-40' : 'opacity-100')}>
            <span className={cx('flex h-5 w-5 items-center justify-center rounded-full border text-[10px]', idx < i ? 'border-olive bg-olive text-white' : idx === i ? 'border-crimson text-crimson' : 'border-beige text-charcoal/40')}>
              {idx < i ? <Check className="h-3 w-3" /> : idx === i ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-crimson" /> : null}
            </span>
            <span className={idx === i ? 'font-medium text-wine' : ''}>{s}</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-charcoal/60">Timing depends on article length and whether optional LLM reasoning is on.</p>
    </div>
  );
}
