import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { CountUp } from '../ui/CountUp';
import { Skeleton } from '../ui/Skeleton';
import type { Statistics } from '../../types/api';

export function StatsStrip() {
  const { data, loading, error } = useApi<Statistics>('stats', (s) => api.statistics(s));
  return (
    <section aria-label="Live statistics" className="border-b border-beige bg-cream">
      <div className="container-x py-6">
        {loading && <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-16" />)}</div>}
        {error && !data && <p className="text-center text-sm text-charcoal/70">Live statistics are unavailable while the backend is unreachable.</p>}
        {data && data.totals.analyzed === 0 && (
          <p className="text-center text-sm text-charcoal/80">No analyses yet — <Link to="/analyze" className="font-medium text-crimson underline">try a sample</Link> to see the live pipeline at work.</p>
        )}
        {data && data.totals.analyzed > 0 && (
          <dl className="grid grid-cols-2 gap-4 text-center sm:grid-cols-4 sm:divide-x sm:divide-wine/20">
            <Stat label="Articles analyzed" value={data.totals.analyzed} />
            <Stat label="Flagged as misinformation" value={data.totals.likely_misinformation} />
            <Stat label="Likely reliable" value={data.totals.likely_reliable} />
            <Stat label="Avg credibility" value={data.totals.avg_credibility} decimals={1} />
          </dl>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value, decimals = 0 }: { label: string; value: number | null; decimals?: number }) {
  return (
    <div className="px-2">
      <dd className="order-2 font-serif text-3xl font-bold text-wine sm:text-4xl">{value == null ? '—' : <CountUp value={value} decimals={decimals} />}</dd>
      <dt className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-charcoal/60">{label}</dt>
    </div>
  );
}
