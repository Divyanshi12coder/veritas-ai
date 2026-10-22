import { Fragment, useMemo, useState } from 'react';
import { ExternalLink, Search } from 'lucide-react';
import { api } from '../api/client';
import { useApi } from '../hooks/useApi';
import { SectionHeading } from '../components/ui/SectionHeading';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Accordion } from '../components/ui/Accordion';
import { Skeleton } from '../components/ui/Skeleton';
import { InlineAlert } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { ConfusionMatrix } from '../components/dashboard/ModelPerformance';
import { pct } from '../lib/format';
import type { KBEntry, ModelCard, ModelInfo } from '../types/api';

function show(v: unknown): string {
  if (v == null) return 'n/a';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function KeyValues({ obj }: { obj: Record<string, unknown> }) {
  const entries = Object.entries(obj);
  if (!entries.length) return <p className="text-sm text-charcoal/65">No details reported.</p>;
  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
      {entries.map(([k, v]) => (<div key={k} className="contents"><dt className="font-mono text-xs uppercase tracking-wider text-charcoal/60">{k.replace(/_/g, ' ')}</dt><dd className="[overflow-wrap:anywhere]">{show(v)}</dd></div>))}
    </dl>
  );
}

function ModelCardView({ m }: { m: ModelCard }) {
  const x = m.metrics;
  return (
    <Card className="flex flex-col">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="wine">{m.kind}</Badge>
        <Badge tone={m.available ? 'olive' : 'neutral'}>{m.available ? 'Available' : 'Not available'}</Badge>
        {m.is_default && <Badge tone="red">Default</Badge>}
      </div>
      <h3 className="mt-3 text-2xl font-bold">{m.label}</h3>
      <p className="mt-1 text-sm text-charcoal/80">{m.description}</p>
      <p className="mt-3 text-sm"><span className="kicker mr-1">Explainability</span>{m.explainability}</p>
      {x ? (
        <>
          <dl className="mt-4 grid grid-cols-5 gap-2 text-center">
            {([['Acc', x.accuracy], ['Prec', x.precision], ['Rec', x.recall], ['F1', x.f1], ['AUC', x.roc_auc]] as const).map(([k, v]) => (
              <div key={k} className="rounded border border-beige bg-cream/60 p-2"><dt className="font-mono text-[10px] uppercase text-charcoal/60">{k}</dt><dd className="num text-sm font-semibold text-wine">{v == null ? 'n/a' : pct(v, 1)}</dd></div>
            ))}
          </dl>
          <div className="mt-4"><ConfusionMatrix m={x} /></div>
          <p className="num mt-2 text-xs text-charcoal/55">Held-out n = {x.n_test}{m.validation_f1 != null ? ` · validation F1 ${m.validation_f1.toFixed(3)}` : ''}{m.trained_at ? ` · trained ${m.trained_at}` : ''}</p>
        </>
      ) : <p className="mt-4 rounded border border-dashed border-wine/25 px-3 py-2 text-sm text-charcoal/65">No evaluation metrics recorded for this model.</p>}
    </Card>
  );
}

function KbTable() {
  const { data, loading, error, reload } = useApi<KBEntry[]>('kb', (s) => api.kb(s));
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const rows = useMemo(() => (data ?? []).filter((e) => `${e.title} ${e.topic} ${e.statement}`.toLowerCase().includes(q.toLowerCase())), [data, q]);
  if (loading) return <Skeleton className="h-40" />;
  if (error) return <InlineAlert title="Knowledge base unavailable" action={<Button size="sm" variant="secondary" onClick={reload}>Retry</Button>}>{error.message}</InlineAlert>;
  return (
    <div>
      <div className="relative mb-3 max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/40" aria-hidden /><input className="field pl-9" placeholder="Filter entries…" aria-label="Filter knowledge base" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <p className="num mb-2 text-xs text-charcoal/60">{rows.length} of {data?.length ?? 0} entries</p>
      <div className="overflow-x-auto rounded-md border border-beige">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-cream font-mono text-[10px] uppercase tracking-wider text-charcoal/70"><tr><th className="px-3 py-2">Entry</th><th className="px-3 py-2">Topic</th><th className="px-3 py-2">Source</th></tr></thead>
          <tbody className="divide-y divide-beige bg-white">
            {rows.map((e) => (
              <Fragment key={e.id}>
                <tr className="cursor-pointer hover:bg-cream/60" onClick={() => setOpen(open === e.id ? null : e.id)}>
                  <td className="px-3 py-2.5"><button aria-expanded={open === e.id} className="text-left font-medium text-wine hover:text-crimson">{e.title}</button></td>
                  <td className="px-3 py-2.5"><Badge>{e.topic}</Badge></td>
                  <td className="px-3 py-2.5">{e.source_url ? <a href={e.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-crimson hover:underline" onClick={(ev) => ev.stopPropagation()}>{e.source_name}<ExternalLink className="h-3 w-3" aria-hidden /></a> : e.source_name}</td>
                </tr>
                {open === e.id && (
                  <tr className="bg-paper"><td colSpan={3} className="px-4 py-3 text-sm">
                    <p>{e.statement}</p>
                    {e.common_false_claims.length > 0 && <><p className="kicker mt-3">Commonly seen false claims</p><ul className="mt-1 list-disc pl-5 text-charcoal/80">{e.common_false_claims.map((c) => <li key={c}>{c}</li>)}</ul></>}
                  </td></tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Models() {
  const { data, loading, error, reload } = useApi<ModelInfo>('model-info', (s) => api.modelInfo(s));
  return (
    <div className="container-x space-y-10 py-10 sm:py-14">
      <SectionHeading as="h1" kicker="The laboratory" title="Models and data" intro="Every model that can power a verdict, with its measured performance, how it explains itself, and what data it saw." />
      {loading && <div className="grid gap-5 md:grid-cols-2"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>}
      {error && <InlineAlert title="Could not load model information" action={<Button size="sm" variant="secondary" onClick={reload}>Retry</Button>}>{error.message}</InlineAlert>}
      {data && (
        <>
          <div className="grid gap-5 md:grid-cols-2">{data.models.map((m) => <ModelCardView key={m.key} m={m} />)}</div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card><p className="kicker">Dataset provenance</p><h2 className="mb-3 text-2xl font-bold">Training data</h2><KeyValues obj={data.dataset} /></Card>
            <Card><p className="kicker">Transformer</p><h2 className="mb-3 text-2xl font-bold">Transformer status</h2><KeyValues obj={data.transformer} /></Card>
          </div>
          <Card>
            <p className="kicker">Pipeline</p><h2 className="mb-3 text-2xl font-bold">Processing steps</h2>
            <ol className="grid gap-2 sm:grid-cols-2">{data.pipeline_steps.map((s, i) => <li key={s} className="flex gap-3 text-sm"><span className="num text-crimson">{String(i + 1).padStart(2, '0')}</span><span>{s}</span></li>)}</ol>
          </Card>
          <Card tone="cream">
            <p className="kicker">Read before trusting</p><h2 className="mb-3 text-2xl font-bold">Caveats</h2>
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">{data.caveats.map((c) => <li key={c}>{c}</li>)}</ul>
          </Card>
        </>
      )}
      <Accordion kicker="Retrieval layer" title="What the knowledge base can know" meta={<span className="num text-xs">RAG</span>}>
        <p className="mb-4 text-sm text-charcoal/75">The evidence step only searches these curated entries. Absence here does not mean a claim is false.</p>
        <KbTable />
      </Accordion>
    </div>
  );
}
