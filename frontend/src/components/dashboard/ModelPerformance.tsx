import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { Skeleton } from '../ui/Skeleton';
import { InlineAlert } from '../ui/EmptyState';
import { Badge } from '../ui/Badge';
import { cx, pct } from '../../lib/format';
import type { ModelCard, ModelInfo, ModelMetrics } from '../../types/api';

export function ConfusionMatrix({ m }: { m: ModelMetrics }) {
  const cm = m.confusion_matrix;
  if (cm.length !== 2 || cm[0].length !== 2) return null;
  const max = Math.max(...cm.flat(), 1);
  const cells = [
    ['True negative', cm[0][0], true], ['False positive', cm[0][1], false],
    ['False negative', cm[1][0], false], ['True positive', cm[1][1], true],
  ] as const;
  return (
    <div>
      <p className="kicker mb-2">Confusion matrix (FAKE = positive)</p>
      <div className="grid grid-cols-[auto_1fr_1fr] gap-1 text-center text-xs">
        <span />
        <span className="font-mono text-charcoal/60">pred REAL</span><span className="font-mono text-charcoal/60">pred FAKE</span>
        <span className="self-center font-mono text-charcoal/60 [writing-mode:vertical-rl] rotate-180">actual REAL</span>
        {cells.slice(0, 2).map(([l, v, good]) => <Cell key={l} l={l} v={v} good={good} max={max} />)}
        <span className="self-center font-mono text-charcoal/60 [writing-mode:vertical-rl] rotate-180">actual FAKE</span>
        {cells.slice(2).map(([l, v, good]) => <Cell key={l} l={l} v={v} good={good} max={max} />)}
      </div>
    </div>
  );
}

function Cell({ l, v, good, max }: { l: string; v: number; good: boolean; max: number }) {
  const a = 0.12 + 0.75 * (v / max);
  return (
    <div className="rounded p-3" style={{ background: good ? `rgba(79,93,58,${a})` : `rgba(139,30,45,${a})`, color: a > 0.5 ? '#FBF8F3' : '#2A2326' }} title={`${l}: ${v}`}>
      <div className="num text-xl font-semibold">{v}</div><div className="text-[10px] uppercase tracking-wide opacity-80">{l}</div>
    </div>
  );
}

function Roc({ m }: { m: ModelMetrics }) {
  if (!m.roc_curve?.length) return <p className="text-sm text-charcoal/65">No ROC curve was exported for this model.</p>;
  const rows = m.roc_curve.map(([x, y]) => ({ fpr: x, tpr: y }));
  return (
    <div role="img" aria-label="ROC curve" className="h-56">
      <p className="kicker mb-1">ROC curve {m.roc_auc != null && `· AUC ${m.roc_auc.toFixed(3)}`}</p>
      <ResponsiveContainer>
        <LineChart data={rows} margin={{ left: -12, right: 8, top: 4, bottom: 4 }}>
          <CartesianGrid stroke="#E8DCC8" />
          <XAxis dataKey="fpr" type="number" domain={[0, 1]} tick={{ fontSize: 10 }} />
          <YAxis type="number" domain={[0, 1]} tick={{ fontSize: 10 }} />
          <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke="#A9782C" strokeDasharray="4 4" />
          <Tooltip contentStyle={{ background: '#FBF8F3', border: '1px solid #E8DCC8', fontSize: 12 }} formatter={(v: number) => v.toFixed(3)} />
          <Line dataKey="tpr" name="TPR" stroke="#8B1E2D" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Metric({ k, v }: { k: string; v: number | null }) {
  return <div className="rounded border border-beige bg-cream/60 p-2.5 text-center"><p className="font-mono text-[10px] uppercase tracking-wider text-charcoal/60">{k}</p><p className="num text-lg font-semibold text-wine">{v == null ? 'n/a' : pct(v, 1)}</p></div>;
}

export function ModelPerformance() {
  const { data, loading, error, reload } = useApi<ModelInfo>('model-info', (s) => api.modelInfo(s));
  const [sel, setSel] = useState<string | null>(null);
  if (loading) return <Skeleton className="h-72" />;
  if (error || !data) return <InlineAlert title="Model metrics unavailable" action={<button className="text-crimson underline" onClick={reload}>Retry</button>}>{error?.message}</InlineAlert>;
  const withMetrics = data.models.filter((m): m is ModelCard & { metrics: ModelMetrics } => !!m.metrics);
  if (!withMetrics.length) return <p className="text-sm text-charcoal/70">No trained model metrics are available yet. Train the models (see Docs) to populate this panel.</p>;
  const cur = withMetrics.find((m) => m.key === sel) ?? withMetrics.find((m) => m.is_default) ?? withMetrics[0];
  const m = cur.metrics;
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Select model">
        {withMetrics.map((x) => (
          <button key={x.key} aria-pressed={x.key === cur.key} onClick={() => setSel(x.key)}
            className={cx('rounded-full border px-3 py-1 text-xs font-medium transition-colors', x.key === cur.key ? 'border-wine bg-wine text-cream' : 'border-beige bg-white hover:bg-beige/60')}>
            {x.label}{x.is_default && ' ★'}
          </button>
        ))}
      </div>
      <div className="mb-3 flex items-center gap-2"><Badge tone="wine">{cur.kind}</Badge><span className="num text-xs text-charcoal/60">held-out test n = {m.n_test}</span></div>
      <div className="grid gap-3 sm:grid-cols-5">
        <Metric k="Accuracy" v={m.accuracy} /><Metric k="Precision" v={m.precision} /><Metric k="Recall" v={m.recall} /><Metric k="F1" v={m.f1} /><Metric k="ROC-AUC" v={m.roc_auc} />
      </div>
      <div className="mt-6 grid gap-8 md:grid-cols-2"><ConfusionMatrix m={m} /><Roc m={m} /></div>
    </div>
  );
}
