import { ArrowRight, Scale } from 'lucide-react';
import { SectionHeading } from '../ui/SectionHeading';
import { LinkButton } from '../ui/Button';
import { Reveal } from '../ui/Reveal';
import { FACTORS } from '../../lib/factors';

export function MethodologyTeaser() {
  return (
    <section className="border-y border-beige bg-cream py-20">
      <div className="container-x grid gap-10 lg:grid-cols-2">
        <div>
          <SectionHeading kicker="Methodology" title="A score you can audit" intro="The credibility score is a weighted blend of six factors. If one cannot be computed, its weight is redistributed rather than guessed." />
          <LinkButton to="/methodology" variant="secondary" className="mt-6" icon={<ArrowRight className="h-4 w-4" />}>Read the methodology</LinkButton>
        </div>
        <Reveal>
          <ul className="space-y-3">
            {FACTORS.map((f) => (
              <li key={f.key}>
                <div className="flex justify-between text-sm"><span className="font-medium">{f.label}</span><span className="num text-charcoal/60">{(f.weight * 100).toFixed(0)}%</span></div>
                <div className="mt-1 h-2 bg-beige"><div className="h-full bg-wine" style={{ width: `${f.weight * 100 * 4}%` }} /></div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-charcoal/60">Documented default weights. Bars are scaled for legibility.</p>
        </Reveal>
      </div>
    </section>
  );
}

export function ResponsibleAI() {
  return (
    <section className="container-x py-20">
      <div className="rule-double border-b-[3px] border-double border-wine/70 bg-white px-6 py-10 shadow-card sm:px-12">
        <div className="flex items-start gap-4">
          <Scale className="mt-1 hidden h-8 w-8 shrink-0 text-crimson sm:block" aria-hidden />
          <div>
            <p className="kicker">Responsible AI</p>
            <h2 className="mt-1 text-3xl font-bold">An estimate, not a ruling.</h2>
            <p className="mt-3 max-w-3xl font-text text-lg leading-relaxed text-charcoal/80">
              Veritrace flags patterns statistically associated with misinformation. Models learn from the datasets they were trained on and can be wrong, biased or out of date. Evidence comes from a small curated knowledge base, so no match is not proof of falsehood. Use it to decide what to scrutinise, then verify with primary sources.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CtaBand() {
  return (
    <section className="bg-wine py-16 text-cream">
      <div className="container-x flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div>
          <p className="kicker !text-beige">Go to press</p>
          <h2 className="mt-1 !text-cream text-3xl font-bold sm:text-4xl">Have an article you are unsure about?</h2>
        </div>
        <LinkButton to="/analyze" size="lg" className="!border-cream !bg-cream !text-wine hover:!bg-beige" icon={<ArrowRight className="h-4 w-4" />}>Analyze an Article</LinkButton>
      </div>
    </section>
  );
}
