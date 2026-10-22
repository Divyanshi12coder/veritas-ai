import { SectionHeading } from '../components/ui/SectionHeading';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { LinkButton } from '../components/ui/Button';
import { Halftone } from '../components/art/Art';

const STACK: Array<[string, string[]]> = [
  ['Frontend', ['React 18', 'TypeScript', 'Vite', 'Tailwind CSS', 'Framer Motion', 'Recharts']],
  ['Backend', ['FastAPI', 'Pydantic', 'SQLite']],
  ['ML / NLP', ['scikit-learn', 'TF-IDF', 'Stylometric features', 'Optional transformer']],
  ['Reasoning', ['Retrieval over curated KB', 'Optional LLM narrative']],
];

export default function About() {
  return (
    <div className="container-x py-10 sm:py-14">
      <SectionHeading as="h1" kicker="About" title="A misinformation workbench that shows its work" intro="Veritrace is a portfolio-grade project exploring how far explainable, locally-run analysis can go in helping people decide what to scrutinise." />
      <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="prose-ed">
          <p>Most credibility tools return a single number. That number is only useful if you can see what produced it. Veritrace therefore treats every analysis as a case file: the model&rsquo;s prediction, the signals behind it, the weighted credibility factors, the source checks, and the evidence retrieved for each claim are all visible and separated, so you can disagree with any part.</p>
          <p>It is designed to degrade gracefully. Without an LLM key it still runs the full local pipeline. Without a trained transformer it uses classical models. When a factor is unavailable, the score says so and renormalises rather than inventing a value.</p>
          <h3>What it is not</h3>
          <p>It is not a fact-checking service and does not determine truth. It estimates risk from language and available evidence.</p>
        </div>
        <div className="space-y-5">
          <Card tone="cream">
            <p className="kicker">Creator</p>
            <h2 className="text-3xl font-bold">Divyanshi</h2>
            <p className="mt-2 text-sm text-charcoal/80">Designed and built Veritrace end to end: data pipeline, models, API and interface.</p>
          </Card>
          <Card>
            <p className="kicker">Tech stack</p>
            <dl className="mt-3 space-y-3">{STACK.map(([k, v]) => <div key={k}><dt className="font-mono text-[10px] uppercase tracking-wider text-charcoal/60">{k}</dt><dd className="mt-1 flex flex-wrap gap-1.5">{v.map((x) => <Badge key={x} tone="neutral" className="normal-case">{x}</Badge>)}</dd></div>)}</dl>
          </Card>
          <Halftone className="w-full opacity-30" rows={5} />
          <div className="flex flex-wrap gap-3"><LinkButton to="/analyze">Try it</LinkButton><LinkButton to="/docs" variant="secondary">Read the docs</LinkButton></div>
        </div>
      </div>
    </div>
  );
}
