import type { ReactNode } from 'react';
import { SectionHeading } from '../components/ui/SectionHeading';
import { RagDiagram } from '../components/art/Art';
import { FACTORS } from '../lib/factors';

function Sec({ id, kicker, title, children }: { id: string; kicker: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 border-t-[3px] border-double border-wine/60 pt-6">
      <p className="kicker">{kicker}</p>
      <h2 className="mb-4 mt-1 text-3xl font-bold">{title}</h2>
      <div className="prose-ed">{children}</div>
    </section>
  );
}

export default function Methodology() {
  const toc = [['nlp', 'NLP pipeline'], ['tfidf', 'TF-IDF'], ['models', 'Models'], ['score', 'Credibility score'], ['rag', 'Evidence retrieval'], ['explain', 'Explainability'], ['limits', 'Limitations']];
  return (
    <div className="container-x py-10 sm:py-14">
      <SectionHeading as="h1" kicker="Methodology" title="How Veritrace reaches a verdict" intro="A plain-language account of each stage, written so that you can judge how far to trust the output." />
      <div className="mt-10 grid gap-10 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav aria-label="On this page" className="hidden lg:block"><ul className="sticky top-32 space-y-2 border-l border-wine/30 pl-4 text-sm">{toc.map(([id, l]) => <li key={id}><a href={`#${id}`} className="text-charcoal/75 hover:text-crimson">{l}</a></li>)}</ul></nav>
        <div className="max-w-3xl space-y-14">
          <Sec id="nlp" kicker="Stage 1" title="NLP pipeline">
            <p>The article is normalised (whitespace, quotes, markup), split into sentences and tokens, then measured. We compute readability (Flesch reading ease, Flesch-Kincaid grade), lexical diversity, sentiment, subjectivity, and style markers that research links to low-quality news: ALL-CAPS words, runs of exclamation marks, emotive vocabulary, absolutist terms (&ldquo;always&rdquo;, &ldquo;never&rdquo;), hedging, and the presence of attribution (&ldquo;according to&rdquo;).</p>
            <p>These numbers feed both the linguistic profile you see in the report and several of the models.</p>
          </Sec>
          <Sec id="tfidf" kicker="Stage 2" title="TF-IDF">
            <p>Term frequency–inverse document frequency scores each word by how often it appears in this article, discounted by how common it is across the training corpus. Words and word pairs that are distinctive for one class receive large weights in a linear model, which is why the TF-IDF classifiers can say <em>which terms</em> pushed the prediction.</p>
            <p>The same representation, restricted to a curated knowledge base, powers evidence retrieval through cosine similarity.</p>
          </Sec>
          <Sec id="models" kicker="Stage 3" title="Models">
            <p>Depending on what has been trained on your backend, you can choose among TF-IDF with logistic regression or a linear SVM, stylometric models (random forest, gradient boosting) that look only at writing style, and an optional transformer. &ldquo;Auto&rdquo; picks the best available. Every report names the model that made the prediction, and, where several exist, shows how they compare. Measured accuracy, precision, recall, F1 and ROC-AUC on a held-out split are on the Models page.</p>
          </Sec>
          <Sec id="score" kicker="Stage 4" title="Credibility score formula">
            <p>The credibility score is a weighted mean of six factors, each scaled 0–100 so that higher always means more credible:</p>
            <div className="not-prose my-5 overflow-x-auto rounded-md border border-beige bg-white">
              <table className="w-full min-w-[420px] text-left font-sans text-sm">
                <thead className="bg-cream font-mono text-[10px] uppercase tracking-wider"><tr><th className="px-3 py-2">Factor</th><th className="px-3 py-2">Weight</th><th className="px-3 py-2">Meaning</th></tr></thead>
                <tbody className="divide-y divide-beige">{FACTORS.map((f) => <tr key={f.key}><td className="px-3 py-2 font-medium">{f.label}</td><td className="num px-3 py-2">{f.weight.toFixed(2)}</td><td className="px-3 py-2 text-charcoal/75">{f.note}</td></tr>)}</tbody>
              </table>
            </div>
            <p className="rounded border-l-4 border-wine bg-cream px-4 py-3 font-mono text-sm">score = Σ(wᵢ · sᵢ) / Σ(wᵢ) over available factors</p>
            <p>When a factor cannot be computed (for example, no source domain was supplied), it is dropped and the remaining weights are renormalised so they sum to one. The report marks such factors &ldquo;unavailable&rdquo; and shows each factor&rsquo;s effective weight.</p>
          </Sec>
          <Sec id="rag" kicker="Stage 5" title="Evidence retrieval (RAG)">
            <p>Check-worthy sentences are extracted as claims. Each is matched against a small curated knowledge base of statements from named sources and known false claims. The strongest matches are shown as evidence, and an assessment (supported, contradicted, unverified, insufficient evidence) is derived from similarity and relation type.</p>
            <RagDiagram className="not-prose my-6 w-full" />
            <p>The knowledge base is intentionally small and curated. An &ldquo;unverified&rdquo; claim simply means nothing relevant was found.</p>
          </Sec>
          <Sec id="explain" kicker="Stage 6" title="Explainability">
            <p>Linear models are explained exactly: each feature&rsquo;s weight times its value is its contribution toward FAKE or REAL. For other model types the report states the method used and its limits. Suspicious phrases are highlighted in the article text. The optional LLM narrative is an aid to reading, labelled as AI-generated, and is <em>not</em> a trace of the classifier&rsquo;s internals.</p>
          </Sec>
          <Sec id="limits" kicker="Honesty" title="Limitations">
            <ul className="list-disc space-y-2 pl-5">
              <li>Models learn dataset-specific patterns and may not transfer to new topics, languages or time periods.</li>
              <li>Style is not truth: accurate articles can be sensational and false ones can be calm.</li>
              <li>The knowledge base is small; lack of evidence is not evidence of falsehood.</li>
              <li>Source tiers are a heuristic and do not capture individual article quality.</li>
              <li>Treat every output as a prompt to verify, not as a verdict of fact.</li>
            </ul>
          </Sec>
        </div>
      </div>
    </div>
  );
}
