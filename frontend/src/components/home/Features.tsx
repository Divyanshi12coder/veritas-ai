import { Eye, Gauge, Network, Quote, ShieldCheck, Sparkles } from 'lucide-react';
import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';
import { ClaimNetwork, NewspaperMagnifier } from '../art/Art';

const F = [
  { i: Gauge, t: 'Composite credibility score', d: 'Six weighted factors, renormalised honestly when one is unavailable.' },
  { i: Eye, t: 'Explainable by design', d: 'Feature contributions and inline highlights show what drove the prediction.' },
  { i: Network, t: 'Evidence retrieval', d: 'Claims are checked against a curated knowledge base with linked sources.' },
  { i: ShieldCheck, t: 'Source checks', d: 'Domain tiers and transparent pass / fail / unknown checks.' },
  { i: Quote, t: 'Multiple models', d: 'Compare classical and optional transformer models on the same article.' },
  { i: Sparkles, t: 'Optional LLM reasoning', d: 'A narrative aid, always labelled as AI-generated. The app works without it.' },
];

export function Features() {
  return (
    <section className="border-y border-beige bg-cream py-20">
      <div className="container-x">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <SectionHeading kicker="What you get" title="A case file for every article" intro="Not a black-box score. A structured report you can interrogate section by section." />
            <NewspaperMagnifier className="mx-auto mt-8 w-full max-w-sm" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {F.map((f, i) => (
              <Reveal key={f.t} delay={i * 0.06}>
                <div className="h-full rounded-lg border border-beige bg-white p-5 shadow-card transition-transform hover:-translate-y-1">
                  <f.i className="h-6 w-6 text-crimson" aria-hidden />
                  <h3 className="mt-3 text-lg font-bold">{f.t}</h3>
                  <p className="mt-1 text-sm text-charcoal/75">{f.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
        <ClaimNetwork className="mx-auto mt-14 hidden w-full max-w-xl opacity-80 md:block" />
      </div>
    </section>
  );
}
