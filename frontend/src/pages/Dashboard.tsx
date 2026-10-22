import type { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { api } from '../api/client';
import { invalidate, useApi } from '../hooks/useApi';
import { SectionHeading } from '../components/ui/SectionHeading';
import { Skeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';
import { InlineAlert } from '../components/ui/EmptyState';
import { Kpis } from '../components/dashboard/Kpis';
import { Populate } from '../components/dashboard/Populate';
import { RecentTable } from '../components/dashboard/RecentTable';
import { ModelPerformance } from '../components/dashboard/ModelPerformance';
import { ChartCard, DailyTrend, DistributionDonut, Histogram, MetricTrend, ModelUsageChart, SourcesChart } from '../components/charts/Charts';
import type { Statistics } from '../types/api';

function Empty({ show, children }: { show: boolean; children: ReactNode }) {
  return show ? <>{children}</> : <p className="py-10 text-center text-sm text-charcoal/60">Not enough data yet.</p>;
}

export default function Dashboard() {
  const { data, loading, error, reload } = useApi<Statistics>('stats', (s) => api.statistics(s));
  const refresh = () => { invalidate('stats'); invalidate('history'); reload(); };

  return (
    <div className="container-x space-y-10 py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading as="h1" kicker="Analytics desk" title="Dashboard" intro="Live aggregates computed by the backend from every stored analysis. Nothing here is simulated." />
        <Button variant="secondary" size="sm" icon={<RefreshCw className="h-4 w-4" />} onClick={refresh}>Refresh</Button>
      </div>

      {loading && <div className="grid gap-4 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-32" />)}<Skeleton className="h-72 lg:col-span-2" /><Skeleton className="h-72 lg:col-span-2" /></div>}
      {error && !data && <InlineAlert title="Could not load statistics" action={<Button size="sm" variant="secondary" onClick={reload}>Retry</Button>}>{error.message}</InlineAlert>}

      {data && data.totals.analyzed === 0 && <Populate onDone={refresh} />}

      {data && data.totals.analyzed > 0 && (
        <>
          <Kpis t={data.totals} />
          <div className="grid gap-5 lg:grid-cols-3">
            <ChartCard kicker="Verdicts" title="Label distribution"><DistributionDonut data={data.distribution} /></ChartCard>
            <ChartCard kicker="Model certainty" title="Confidence histogram"><Histogram data={data.confidence_histogram} label="Histogram of model confidence" /></ChartCard>
            <ChartCard kicker="Composite score" title="Credibility histogram"><Histogram data={data.credibility_histogram} color="#6B1D2A" label="Histogram of credibility scores" /></ChartCard>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-3"><ChartCard kicker="Over time" title="Daily volume and credibility"><Empty show={data.daily.length > 0}><DailyTrend data={data.daily} /></Empty></ChartCard></div>
            <ChartCard kicker="Tone" title="Sentiment trend"><Empty show={data.daily.length > 0}><MetricTrend data={data.daily} dataKey="avg_sentiment" name="Avg sentiment" color="#6B1D2A" /></Empty></ChartCard>
            <ChartCard kicker="Language" title="Suspicious-phrase trend"><Empty show={data.daily.length > 0}><MetricTrend data={data.daily} dataKey="avg_suspicious_phrases" name="Avg suspicious phrases" color="#8B1E2D" /></Empty></ChartCard>
            <ChartCard kicker="Engines" title="Model usage"><Empty show={data.model_usage.length > 0}><ModelUsageChart data={data.model_usage} /></Empty></ChartCard>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <ChartCard kicker="Sources" title="Source reliability" note="Average credibility score of analyses per domain."><Empty show={data.sources.length > 0}><SourcesChart data={data.sources} /></Empty></ChartCard>
            <ChartCard kicker="Language" title="Top suspicious phrases">
              <Empty show={data.top_suspicious_phrases.length > 0}>
                <ol className="space-y-2">
                  {data.top_suspicious_phrases.slice(0, 10).map((p, i) => {
                    const max = data.top_suspicious_phrases[0].count || 1;
                    return (
                      <li key={p.phrase} className="flex items-center gap-3 text-sm">
                        <span className="num w-5 text-charcoal/40">{i + 1}</span>
                        <span className="w-40 shrink-0 truncate font-text" title={p.phrase}>“{p.phrase}”</span>
                        <div className="h-2 flex-1 rounded-sm bg-beige"><div className="h-full rounded-sm bg-crimson" style={{ width: `${(p.count / max) * 100}%` }} /></div>
                        <span className="num w-6 text-right text-xs">{p.count}</span>
                      </li>
                    );
                  })}
                </ol>
              </Empty>
            </ChartCard>
          </div>
        </>
      )}

      <section aria-labelledby="perf">
        <p className="kicker">Held-out evaluation</p>
        <h2 id="perf" className="mb-4 mt-1 text-3xl font-bold">Model performance</h2>
        <div className="rounded-lg border border-beige bg-white p-5 shadow-card"><ModelPerformance /></div>
        <p className="mt-2 text-xs text-charcoal/60">Metrics come from the backend's training run on a held-out test split. See Models for dataset provenance and caveats.</p>
      </section>

      {data && data.totals.analyzed > 0 && (
        <section aria-labelledby="recent">
          <p className="kicker">Archive</p>
          <h2 id="recent" className="mb-4 mt-1 text-3xl font-bold">Recent analyses</h2>
          <div className="rounded-lg border border-beige bg-white p-5 shadow-card"><RecentTable onChanged={refresh} /></div>
        </section>
      )}
    </div>
  );
}
