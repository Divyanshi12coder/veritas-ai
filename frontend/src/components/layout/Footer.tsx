import { Link } from 'react-router-dom';
import { Logo } from './Logo';

const COLS: Array<{ h: string; links: Array<[string, string]> }> = [
  { h: 'Product', links: [['Analyze', '/analyze'], ['Dashboard', '/dashboard'], ['Models', '/models']] },
  { h: 'Learn', links: [['Methodology', '/methodology'], ['Documentation', '/docs'], ['About', '/about']] },
];

export function Footer() {
  return (
    <footer className="mt-24 bg-wine text-cream">
      <div className="container-x py-14">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr_1.2fr]">
          <div>
            <Logo light />
            <p className="mt-4 max-w-sm font-text text-sm leading-relaxed text-cream/75">
              An explainable misinformation-analysis workbench. It estimates; it does not adjudicate truth. Always verify independently.
            </p>
          </div>
          {COLS.map((c) => (
            <nav key={c.h} aria-label={c.h}>
              <p className="kicker !text-beige">{c.h}</p>
              <ul className="mt-3 space-y-2 text-sm">
                {c.links.map(([l, to]) => <li key={to}><Link to={to} className="text-cream/80 hover:text-white hover:underline">{l}</Link></li>)}
              </ul>
            </nav>
          ))}
          <div>
            <p className="kicker !text-beige">Responsible AI</p>
            <p className="mt-3 text-sm leading-relaxed text-cream/75">Scores are probabilistic signals from statistical models and a small curated knowledge base. They are decision support, not fact-checking.</p>
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-cream/20 pt-5 font-mono text-[11px] tracking-wider text-cream/60 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} VERITRACE · MISINFORMATION INTELLIGENCE</span>
          <span>Created by Divyanshi</span>
        </div>
      </div>
    </footer>
  );
}
