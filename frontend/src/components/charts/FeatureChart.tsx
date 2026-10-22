import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { FeatureContribution } from '../../types/api';

interface Row { name: string; value: number; kind: string }

/** Diverging bars: positive (toward FAKE) in crimson, negative (toward REAL) in olive-ink. */
export function FeatureChart({ fake, real }: { fake: FeatureContribution[]; real: FeatureContribution[] }) {
  const rows: Row[] = [...fake, ...real]
    .map((f) => ({ name: f.feature.length > 28 ? `${f.feature.slice(0, 27)}…` : f.feature, value: Number(f.contribution.toFixed(4)), kind: f.kind }))
    .sort((a, b) => b.value - a.value);
  if (!rows.length) return <p className="text-sm text-charcoal/70">No feature contributions were returned for this model.</p>;
  return (
    <div>
      <div className="mb-2 flex justify-between font-mono text-[10px] uppercase tracking-widest">
        <span className="text-olive">← pushes toward REAL</span>
        <span className="text-crimson">pushes toward FAKE →</span>
      </div>
      <div role="img" aria-label="Diverging bar chart of feature contributions toward fake or real" style={{ height: Math.max(220, rows.length * 28 + 40) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
            <CartesianGrid horizontal={false} stroke="#E8DCC8" />
            <XAxis type="number" tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono', fill: '#2A2326' }} />
            <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: '#2A2326' }} />
            <ReferenceLine x={0} stroke="#4A1220" />
            <Tooltip
              cursor={{ fill: 'rgba(232,220,200,.5)' }}
              contentStyle={{ background: '#FBF8F3', border: '1px solid #E8DCC8', fontSize: 12 }}
              formatter={(v: number, _n, p) => [v.toFixed(4), `${(p.payload as Row).kind} contribution`]}
            />
            <Bar dataKey="value" radius={2}>
              {rows.map((r) => <Cell key={r.name + r.kind} fill={r.value >= 0 ? '#8B1E2D' : '#4F5D3A'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
