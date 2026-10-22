import { AlertOctagon, AlertTriangle, Info } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import type { Severity, Signal } from '../../types/api';
import { cx } from '../../lib/format';

const STYLE: Record<Severity, string> = {
  high: 'border-crimson bg-crimson/10 text-crimson',
  medium: 'border-ochre bg-ochre/10 text-[#7a5516]',
  low: 'border-beige bg-beige/50 text-charcoal',
  info: 'border-beige bg-white text-charcoal/80',
};

export function SignalsSection({ signals }: { signals: Signal[] }) {
  if (!signals.length) return <p className="text-sm text-charcoal/70">The model raised no specific signals for this article.</p>;
  return (
    <div>
      <ul className="flex flex-wrap gap-2">
        {signals.map((s) => {
          const I = s.severity === 'high' ? AlertOctagon : s.severity === 'medium' ? AlertTriangle : Info;
          return (
            <li key={s.key}>
              <Tooltip text={s.detail} focusable>
                <span className={cx('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm', STYLE[s.severity])}>
                  <I className="h-3.5 w-3.5" aria-hidden />
                  {s.label}
                  <span className="font-mono text-[10px] uppercase opacity-70">{s.severity}</span>
                </span>
              </Tooltip>
            </li>
          );
        })}
      </ul>
      <ul className="mt-4 space-y-1.5 text-sm text-charcoal/80">
        {signals.map((s) => <li key={s.key}><strong className="font-semibold text-wine">{s.label}.</strong> {s.detail}</li>)}
      </ul>
    </div>
  );
}
