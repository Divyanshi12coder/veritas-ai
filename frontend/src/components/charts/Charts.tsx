import type { ReactNode } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { LABEL_COLOR, LABEL_SHORT, MODEL_LABELS, toLabel } from '../../lib/format';
import type { BucketCount, DailyPoint, LabelCount, ModelUsage, SourceStat } from '../../types/api';

const AXIS = { fontSize: 11, fontFamily: 'IBM Plex Mono', fill: '#2A2326' } as const;
const TIP = { background: '#FBF8F3', border: '1px solid #E8DCC8', fontSize: 12, borderRadius: 6 } as const;

export function ChartCard({ title, kicker, children, note }: { title: string; kicker: string; children: ReactNode; note?: string }) {
  return (
    <section className="rounded-lg border border-beige bg-white p-5 shadow-card">
      <p className="kicker">{kicker}</p>
      <h3 className="text-xl font-bold">{title}</h3>
      <div className="mt-4">{children}</div>
      {note && <p className="mt-2 text-xs text-charcoal/60">{note}</p>}
    </section>
  );
}

const Box = ({ children, h = 240, label }: { children: ReactNode; h?: number; label: string }) => (
  <div role="img" aria-label={label} style={{ height: h }}>{children}</div>
);

export function DistributionDonut({ data }: { data: LabelCount[] }) {
  const rows = data.map((d) => { const l = toLabel(d.label); return { name: l ? LABEL_SHORT[l] : d.label, value: d.count, color: l ? LABEL_COLOR[l] : '#6B1D2A' }; });
  return (
    <Box label="Donut chart of verdict distribution">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={rows} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2} stroke="#FBF8F3">
            {rows.map((r) => <Cell key={r.name} fill={r.color} />)}
          </Pie>
          <Tooltip contentStyle={TIP} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
}

export function Histogram({ data, color = '#8B1E2D', label }: { data: BucketCount[]; color?: string; label: string }) {
  return (
    <Box label={label}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} stroke="#E8DCC8" />
          <XAxis dataKey="bucket" tick={AXIS} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={AXIS} />
          <Tooltip contentStyle={TIP} cursor={{ fill: 'rgba(232,220,200,.5)' }} />
          <Bar dataKey="count" name="Articles" fill={color} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}

export function DailyTrend({ data }: { data: DailyPoint[] }) {
  return (
    <Box label="Daily analyses count and average credibility">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ left: -12, right: 0, top: 8 }}>
          <CartesianGrid vertical={false} stroke="#E8DCC8" />
          <XAxis dataKey="date" tick={AXIS} />
          <YAxis yAxisId="l" allowDecimals={false} tick={AXIS} />
          <YAxis yAxisId="r" orientation="right" domain={[0, 100]} tick={AXIS} />
          <Tooltip contentStyle={TIP} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="l" dataKey="count" name="Analyses" fill="#E8DCC8" stroke="#6B1D2A" maxBarSize={56} />
          <Line yAxisId="r" type="monotone" dataKey="avg_credibility" name="Avg credibility" stroke="#8B1E2D" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
}

export function MetricTrend({ data, dataKey, name, color }: { data: DailyPoint[]; dataKey: 'avg_sentiment' | 'avg_suspicious_phrases'; name: string; color: string }) {
  return (
    <Box label={`${name} trend over time`}>
      <ResponsiveContainer>
        {dataKey === 'avg_sentiment' ? (
          <LineChart data={data} margin={{ left: -12, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} stroke="#E8DCC8" />
            <XAxis dataKey="date" tick={AXIS} /><YAxis tick={AXIS} domain={[-1, 1]} />
            <Tooltip contentStyle={TIP} />
            <Line type="monotone" dataKey={dataKey} name={name} stroke={color} strokeWidth={2} dot={{ r: 3 }} connectNulls />
          </LineChart>
        ) : (
          <AreaChart data={data} margin={{ left: -12, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} stroke="#E8DCC8" />
            <XAxis dataKey="date" tick={AXIS} /><YAxis tick={AXIS} />
            <Tooltip contentStyle={TIP} />
            <Area type="monotone" dataKey={dataKey} name={name} stroke={color} fill={color} fillOpacity={0.2} connectNulls />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </Box>
  );
}

export function SourcesChart({ data }: { data: SourceStat[] }) {
  const rows = data.slice(0, 8);
  return (
    <Box label="Average credibility by source domain" h={Math.max(200, rows.length * 34 + 30)}>
      <ResponsiveContainer>
        <BarChart data={rows} layout="vertical" margin={{ left: 4, right: 16 }}>
          <CartesianGrid horizontal={false} stroke="#E8DCC8" />
          <XAxis type="number" domain={[0, 100]} tick={AXIS} />
          <YAxis type="category" dataKey="domain" width={120} tick={{ fontSize: 11, fill: '#2A2326' }} />
          <Tooltip contentStyle={TIP} formatter={(v: number, _n, p) => [`${v.toFixed(0)} (${(p.payload as SourceStat).count} analyses)`, 'Avg credibility']} />
          <Bar dataKey="avg_credibility" radius={[0, 2, 2, 0]}>
            {rows.map((r) => <Cell key={r.domain} fill={r.avg_credibility >= 65 ? '#4F5D3A' : r.avg_credibility >= 40 ? '#A9782C' : '#8B1E2D'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}

export function ModelUsageChart({ data }: { data: ModelUsage[] }) {
  const rows = data.map((d) => ({ name: MODEL_LABELS[d.model_key] ?? d.model_key, count: d.count }));
  return (
    <Box label="Analyses per model" h={Math.max(160, rows.length * 38 + 30)}>
      <ResponsiveContainer>
        <BarChart data={rows} layout="vertical" margin={{ left: 4, right: 16 }}>
          <CartesianGrid horizontal={false} stroke="#E8DCC8" />
          <XAxis type="number" allowDecimals={false} tick={AXIS} />
          <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11, fill: '#2A2326' }} />
          <Tooltip contentStyle={TIP} />
          <Bar dataKey="count" name="Analyses" fill="#6B1D2A" radius={[0, 2, 2, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}
