import { useEffect, useState } from 'react';
import { animate, useReducedMotion } from 'framer-motion';
import { scoreColor } from '../../lib/format';

interface Props { value: number; size?: number; label?: string; color?: string; sub?: string }

/** SVG 270-degree gauge, animated from 0 to `value` (0-100). */
export function Dial({ value, size = 200, label, color, sub }: Props) {
  const reduce = useReducedMotion();
  const [v, setV] = useState(reduce ? value : 0);
  useEffect(() => {
    if (reduce) { setV(value); return; }
    const c = animate(0, value, { duration: 1.3, ease: [0.22, 1, 0.36, 1], onUpdate: setV });
    return () => c.stop();
  }, [value, reduce]);

  const r = 80, cx0 = 100, cy0 = 100, sweep = 270, start = 135;
  const pt = (deg: number, rad = r) => {
    const a = (deg * Math.PI) / 180;
    return [cx0 + rad * Math.cos(a), cy0 + rad * Math.sin(a)] as const;
  };
  const arc = (from: number, to: number, rad = r) => {
    const [x1, y1] = pt(from, rad), [x2, y2] = pt(to, rad);
    return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${rad} ${rad} 0 ${to - from > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  };
  const clamped = Math.max(0, Math.min(100, v));
  const end = start + (sweep * clamped) / 100;
  const col = color ?? scoreColor(value);
  const ticks = Array.from({ length: 11 }, (_, i) => start + (sweep * i) / 10);
  const [nx, ny] = pt(end, r - 14);

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }} role="img" aria-label={`${label ?? 'Score'}: ${Math.round(value)} out of 100${sub ? `, ${sub}` : ''}`}>
      <svg viewBox="0 0 200 200" width={size} height={size}>
        <path d={arc(start, start + sweep)} fill="none" stroke="#E8DCC8" strokeWidth="12" strokeLinecap="round" />
        {clamped > 0.5 && <path d={arc(start, end)} fill="none" stroke={col} strokeWidth="12" strokeLinecap="round" />}
        {ticks.map((t, i) => {
          const [a, b] = pt(t, 94), [c, d] = pt(t, i % 5 === 0 ? 100 : 98);
          return <line key={t} x1={a} y1={b} x2={c} y2={d} stroke="#6B1D2A" strokeOpacity={0.5} strokeWidth={i % 5 === 0 ? 1.5 : 1} />;
        })}
        <line x1={cx0} y1={cy0} x2={nx} y2={ny} stroke="#4A1220" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={cx0} cy={cy0} r="5" fill="#4A1220" />
      </svg>
      <div className="pointer-events-none absolute inset-x-0 bottom-[8%] text-center">
        <div className="font-serif font-bold leading-none text-wine" style={{ fontSize: size * 0.2 }}>{Math.round(clamped)}</div>
        {label && <div className="mt-1 font-mono uppercase tracking-widest text-charcoal/60" style={{ fontSize: Math.max(9, size * 0.045) }}>{label}</div>}
      </div>
    </div>
  );
}
