import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { SectionHeading } from '../components/ui/SectionHeading';
import { Accordion } from '../components/ui/Accordion';
import { Card } from '../components/ui/Card';

const ENDPOINTS: Array<[string, string, string]> = [
  ['POST', '/api/analyze', 'Analyze pasted text (title, body, optional author / source_url / model / use_llm).'],
  ['POST', '/api/analyze/url', 'Fetch a URL, extract the article and analyze it.'],
  ['GET', '/api/analysis/{id}', 'Fetch a stored analysis.'],
  ['DELETE', '/api/analysis/{id}', 'Delete a stored analysis.'],
  ['GET', '/api/history', 'Paginated history (limit, offset, label, q).'],
  ['GET', '/api/statistics', 'Aggregate statistics for the dashboard.'],
  ['GET', '/api/health', 'Service health, loaded models, LLM / RAG status.'],
  ['GET', '/api/model-info', 'Model cards, metrics, dataset provenance, caveats.'],
  ['GET', '/api/samples', 'Sample articles.'],
  ['GET', '/api/kb', 'Knowledge-base entries used for retrieval.'],
];

const CURL = `# analyze text
curl -X POST http://localhost:8000/api/analyze \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Example headline","body":"<at least 80 characters of article text...>","model":"auto","use_llm":false}'

# analyze a URL
curl -X POST http://localhost:8000/api/analyze/url \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com/story","model":"auto","use_llm":false}'

# history, filtered
curl "http://localhost:8000/api/history?limit=10&label=likely_misinformation"`;

const FAQ: Array<[string, string]> = [
  ['Why does the page say the backend is unreachable?', 'The frontend talks to the FastAPI server on port 8000. Start it, then use Retry. In development Vite proxies /api to http://localhost:8000; for a hosted build set VITE_API_BASE_URL.'],
  ['Why is "Use LLM reasoning" disabled?', 'It is optional and requires an API key configured on the backend. Everything else works without it.'],
  ['Can I trust a "Likely reliable" verdict?', 'No verdict is proof. The result is a statistical estimate; verify with primary sources.'],
  ['Why is a model marked not available?', 'It has not been trained or loaded on the backend. Auto picks the best available one.'],
  ['Why did URL analysis fail?', 'Some sites block automated fetching, require JavaScript or sit behind a paywall. Paste the article text instead.'],
  ['Where is my data stored?', 'Analyses are stored by your own backend instance in its database. Delete any analysis from its page or the dashboard.'],
];

function Code({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard blocked */ } };
  return (
    <div className="relative">
      <button onClick={copy} aria-label="Copy to clipboard" className="absolute right-2 top-2 rounded bg-cream/10 p-1.5 text-cream hover:bg-cream/20">{done ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</button>
      <pre className="overflow-x-auto rounded-md bg-wine p-4 pr-12 font-mono text-xs leading-relaxed text-cream"><code>{text}</code></pre>
    </div>
  );
}

export default function Docs() {
  return (
    <div className="container-x space-y-10 py-10 sm:py-14">
      <SectionHeading as="h1" kicker="Documentation" title="Using Veritrace" intro="Run it, use it, and call the API directly." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><p className="kicker">Quick start</p><h2 className="mb-3 text-2xl font-bold">Run locally</h2>
          <Code text={`# backend\ncd backend\npip install -r requirements.txt\nuvicorn app.main:app --port 8000\n\n# frontend\ncd frontend\nnpm install\nnpm run dev`} />
        </Card>
        <Card><p className="kicker">Workflow</p><h2 className="mb-3 text-2xl font-bold">How to use</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
            <li>Open <strong>Analyze</strong> and paste an article, give a URL, or choose a sample.</li>
            <li>Pick a model (Auto is fine) and optionally enable LLM reasoning.</li>
            <li>Read the verdict, then open each section to see why.</li>
            <li>Share the permalink, or find it later on the <strong>Dashboard</strong>.</li>
          </ol>
          <p className="kicker mt-5">Keyboard</p>
          <ul className="mt-1 space-y-1 text-sm"><li><kbd className="rounded border border-beige bg-cream px-1.5 font-mono text-xs">Tab</kbd> move focus · <kbd className="rounded border border-beige bg-cream px-1.5 font-mono text-xs">Enter</kbd> / <kbd className="rounded border border-beige bg-cream px-1.5 font-mono text-xs">Space</kbd> toggle sections</li><li><kbd className="rounded border border-beige bg-cream px-1.5 font-mono text-xs">←</kbd> <kbd className="rounded border border-beige bg-cream px-1.5 font-mono text-xs">→</kbd> switch input tabs · <kbd className="rounded border border-beige bg-cream px-1.5 font-mono text-xs">Esc</kbd> close dialogs</li></ul>
        </Card>
      </div>
      <section>
        <p className="kicker">API reference</p><h2 className="mb-4 mt-1 text-3xl font-bold">Endpoints</h2>
        <div className="overflow-x-auto rounded-md border border-beige bg-white">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-cream font-mono text-[10px] uppercase tracking-wider"><tr><th className="px-3 py-2">Method</th><th className="px-3 py-2">Path</th><th className="px-3 py-2">Description</th></tr></thead>
            <tbody className="divide-y divide-beige">{ENDPOINTS.map(([m, p, d]) => <tr key={m + p}><td className="px-3 py-2 font-mono text-xs font-semibold text-crimson">{m}</td><td className="px-3 py-2 font-mono text-xs">{p}</td><td className="px-3 py-2 text-charcoal/80">{d}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="mt-5"><Code text={CURL} /></div>
        <p className="mt-2 text-xs text-charcoal/60">Errors are JSON: <code className="font-mono">{'{"detail": "message"}'}</code>. The interactive OpenAPI docs are served by FastAPI at <code className="font-mono">/docs</code> on the backend.</p>
      </section>
      <section>
        <p className="kicker">FAQ</p><h2 className="mb-4 mt-1 text-3xl font-bold">Frequently asked questions</h2>
        <div className="space-y-3">{FAQ.map(([q, a], i) => <Accordion key={q} title={q} defaultOpen={i === 0} variant="section"><p className="text-sm leading-relaxed">{a}</p></Accordion>)}</div>
      </section>
    </div>
  );
}
