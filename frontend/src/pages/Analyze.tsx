import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Globe, Library, Link2 } from 'lucide-react';
import { api, errorMessage } from '../api/client';
import { invalidate, useApi } from '../hooks/useApi';
import { useHealth } from '../hooks/useHealth';
import { SectionHeading } from '../components/ui/SectionHeading';
import { Tabs } from '../components/ui/Tabs';
import { Card } from '../components/ui/Card';
import { ProgressSteps } from '../components/ui/ProgressSteps';
import { ReportSkeleton } from '../components/ui/Skeleton';
import { InlineAlert } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { OptionsBar } from '../components/analyze/OptionsBar';
import type { Options } from '../components/analyze/OptionsBar';
import { PasteForm } from '../components/analyze/PasteForm';
import { UrlForm } from '../components/analyze/UrlForm';
import { SamplesList } from '../components/analyze/SamplesList';
import { AnalysisReport } from '../components/report/AnalysisReport';
import type { AnalysisResponse, ModelInfo, SampleArticle } from '../types/api';

type Tab = 'paste' | 'url' | 'samples';

export default function Analyze() {
  const [tab, setTab] = useState<Tab>('paste');
  const [options, setOptions] = useState<Options>({ model: 'auto', useLlm: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const ctrl = useRef<AbortController | null>(null);
  const toast = useToast();
  const { llmConfigured } = useHealth();
  const { data: info } = useApi<ModelInfo>('model-info', (s) => api.modelInfo(s));

  const run = useCallback(async (fn: (s: AbortSignal) => Promise<AnalysisResponse>) => {
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setBusy(true); setError(null); setResult(null);
    try {
      const r = await fn(c.signal);
      invalidate('stats'); invalidate('history');
      setResult(r);
      toast.push('success', 'Analysis complete.');
      requestAnimationFrame(() => document.getElementById('report-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setError(errorMessage(e));
    } finally {
      if (ctrl.current === c) setBusy(false);
    }
  }, [toast]);

  const llm = llmConfigured && options.useLlm;
  const runSample = (s: SampleArticle) => run((sig) => api.analyze({ title: s.title, body: s.body, author: s.author, source_url: s.source_url, model: options.model, use_llm: llm }, sig));
  const copy = async () => {
    if (!result) return;
    try { await navigator.clipboard.writeText(`${window.location.origin}/analysis/${result.id}`); toast.push('success', 'Permalink copied.'); }
    catch { toast.push('error', 'Could not copy the link.'); }
  };

  return (
    <div className="container-x py-10 sm:py-14">
      <SectionHeading as="h1" kicker="The analysis desk" title="Analyze an article" intro="Paste text, fetch from a URL, or run a sample. You get a verdict, a credibility breakdown, and the evidence behind both." />
      <div className="mt-8 grid gap-6">
        <Card className="space-y-5">
          <Tabs label="Input method" value={tab} onChange={setTab} tabs={[
            { key: 'paste', label: 'Paste article', icon: <FileText className="h-4 w-4" /> },
            { key: 'url', label: 'From URL', icon: <Globe className="h-4 w-4" /> },
            { key: 'samples', label: 'Samples', icon: <Library className="h-4 w-4" /> },
          ]} />
          <OptionsBar value={{ ...options, useLlm: llm }} onChange={setOptions} info={info} llmConfigured={llmConfigured} />
          <div role="tabpanel" aria-labelledby={`tab-${tab}`}>
            {tab === 'paste' && <PasteForm options={{ ...options, useLlm: llm }} busy={busy} onSubmit={(r) => run((s) => api.analyze(r, s))} />}
            {tab === 'url' && <UrlForm options={{ ...options, useLlm: llm }} busy={busy} onSubmit={(r) => run((s) => api.analyzeUrl(r, s))} />}
            {tab === 'samples' && <SamplesList busy={busy} onRun={runSample} />}
          </div>
        </Card>

        {error && (
          <InlineAlert title="Analysis failed" action={busy ? undefined : <Button size="sm" variant="secondary" onClick={() => setError(null)}>Dismiss</Button>}>{error}</InlineAlert>
        )}
        {busy && (<><ProgressSteps /><ReportSkeleton /></>)}
        {result && !busy && (
          <div id="report-top" className="scroll-mt-28 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="kicker">Result</p>
              <div className="flex gap-2">
                <Link to={`/analysis/${result.id}`} className="inline-flex items-center gap-1 text-sm text-crimson hover:underline">Open permalink</Link>
                <Button size="sm" variant="secondary" icon={<Link2 className="h-4 w-4" />} onClick={copy}>Copy link</Button>
              </div>
            </div>
            <AnalysisReport a={result} />
          </div>
        )}
      </div>
    </div>
  );
}
