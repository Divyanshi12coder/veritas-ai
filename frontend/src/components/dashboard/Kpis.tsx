import { CountUp } from '../ui/CountUp';
import type { Totals } from '../../types/api';

function Kpi({ label, value, decimals = 0, suffix, hint }: { label: string; value: number | null; decimals?: number; suffix?: string; hint: string }) {
  return (
    <div className="rounded-lg border border-beige bg-white p-5 shadow-card">
      <p className="kicker">{label}</p>
      <p className="mt-2 font-serif text-4xl font-bold text-wine">
        {value == null ? <span className="text-charcoal/40">—</span> : <CountUp value={value} decimals={decimals} suffix={suffix} />}
      </p>
      <p className="mt-1 text-xs text-charcoal/60">{hint}</p>
    </div>
  );
}

export function Kpis({ t }: { t: Totals }) {
  const share = t.analyzed ? (t.likely_misinformation / t.analyzed) * 100 : null;
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Kpi label="Articles analyzed" value={t.analyzed} hint="Stored analyses" />
      <Kpi label="Flagged misinformation" value={share} decimals={1} suffix="%" hint={`${t.likely_misinformation} of ${t.analyzed}`} />
      <Kpi label="Avg credibility" value={t.avg_credibility} decimals={1} suffix="/100" hint="Mean composite score" />
      <Kpi label="Avg confidence" value={t.avg_confidence == null ? null : t.avg_confidence * 100} decimals={1} suffix="%" hint="Mean model confidence" />
    </div>
  );
}
