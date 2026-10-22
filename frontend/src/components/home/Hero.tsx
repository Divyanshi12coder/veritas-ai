import { ArrowRight, BarChart3 } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { LinkButton } from '../ui/Button';
import { Dial } from '../ui/Dial';
import { Halftone } from '../art/Art';

/** STATIC, clearly-labelled illustration. These numbers are not real analysis output. */
const ILLUSTRATIVE = { score: 34, factors: [['Linguistic reliability', 41], ['Source credibility', 28], ['Evidence strength', 22], ['Calm tone', 38]] as Array<[string, number]> };

function ClippingCard() {
  const reduce = useReducedMotion();
  return (
    <motion.figure
      initial={reduce ? false : { opacity: 0, rotate: 3, y: 24 }}
      animate={{ opacity: 1, rotate: -1.5, y: 0 }}
      transition={{ duration: 0.9, delay: 0.2 }}
      className="relative mx-auto w-full max-w-md border border-wine/40 bg-cream p-5 shadow-clip"
      aria-label="Illustrative example of a credibility report"
    >
      <span className="absolute -top-3 left-5 bg-wine px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-cream">Illustrative example</span>
      <div className="border-b-[3px] border-double border-wine/70 pb-2 text-center">
        <p className="kicker">Credibility desk</p>
        <p className="font-serif text-xl font-bold text-wine">Report on a sample story</p>
      </div>
      <div className="mt-3 grid grid-cols-[auto_1fr] items-center gap-4">
        <Dial value={ILLUSTRATIVE.score} size={140} label="Score" />
        <ul className="space-y-2.5">
          {ILLUSTRATIVE.factors.map(([l, v]) => (
            <li key={l}>
              <div className="flex justify-between text-[11px]"><span>{l}</span><span className="num">{v}</span></div>
              <div className="h-1.5 bg-beige"><motion.div className="h-full bg-crimson" initial={{ width: 0 }} animate={{ width: `${v}%` }} transition={{ duration: 1, delay: 0.6 }} /></div>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-3 border-t border-wine/30 pt-2 text-[11px] leading-snug text-charcoal/70">
        Shown for layout only — a static mock-up, not produced by the model. Real reports include verdicts, evidence and explanations.
      </p>
    </motion.figure>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-beige">
      <Halftone className="pointer-events-none absolute -right-10 top-0 hidden h-64 w-[34rem] opacity-[0.12] lg:block" />
      <div className="container-x grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <p className="kicker">The Analysis Desk · Explainable misinformation intelligence</p>
          <div className="mt-3 h-[7px] w-24 border-y border-wine/70" aria-hidden />
          <h1 className="mt-5 text-[2.6rem] font-extrabold leading-[1.04] sm:text-6xl lg:text-[4.2rem]">
            Separate Signal From <span className="italic text-crimson">Misinformation.</span>
          </h1>
          <p className="mt-6 max-w-xl font-text text-lg leading-relaxed text-charcoal/80">
            Veritrace combines NLP, machine learning, source credibility, evidence retrieval and optional LLM reasoning into one explainable verdict. Every score shows its work: which phrases, which signals, which evidence.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton to="/analyze" size="lg" icon={<ArrowRight className="h-4 w-4" />}>Analyze an Article</LinkButton>
            <LinkButton to="/dashboard" size="lg" variant="secondary" icon={<BarChart3 className="h-4 w-4" />}>Explore Dashboard</LinkButton>
          </div>
        </div>
        <ClippingCard />
      </div>
    </section>
  );
}
