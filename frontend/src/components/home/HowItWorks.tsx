import { Brain, Database, FileInput, ListChecks, ScanText } from 'lucide-react';
import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';

const STEPS = [
  { icon: FileInput, t: 'Ingest', d: 'Paste text or fetch a URL. The article is cleaned and its metadata and source domain extracted.' },
  { icon: ScanText, t: 'NLP features', d: 'Readability, sentiment, subjectivity, caps and punctuation habits, emotive and absolutist language.' },
  { icon: Brain, t: 'Classify', d: 'TF-IDF and stylometric models estimate the probability the article resembles known misinformation.' },
  { icon: Database, t: 'Retrieve evidence', d: 'Claims are matched against a curated knowledge base (RAG-style retrieval) and assessed.' },
  { icon: ListChecks, t: 'Explain', d: 'Top features, highlighted phrases, a weighted credibility score and optional LLM narrative.' },
];

export function HowItWorks() {
  return (
    <section className="container-x py-20">
      <SectionHeading kicker="The pipeline" title="From raw text to an explainable verdict" intro="Five stages, each inspectable in the final report." />
      <div role="list" className="relative mt-12 grid gap-8 md:grid-cols-5">
        <div aria-hidden className="absolute left-0 right-0 top-7 hidden border-t border-dashed border-wine/40 md:block" />
        {STEPS.map((s, i) => (
          <Reveal key={s.t} delay={i * 0.1}>
            <div role="listitem" className="relative">
              <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full border-2 border-wine bg-paper text-wine"><s.icon className="h-6 w-6" aria-hidden /></div>
              <p className="num mt-4 text-xs text-crimson">STEP 0{i + 1}</p>
              <h3 className="text-xl font-bold">{s.t}</h3>
              <p className="mt-1 text-sm leading-relaxed text-charcoal/75">{s.d}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
