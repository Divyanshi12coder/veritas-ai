import type { ReactNode } from 'react';
import { cx } from '../../lib/format';

export type Tone = 'red' | 'ochre' | 'olive' | 'neutral' | 'wine';

const T: Record<Tone, string> = {
  red: 'bg-crimson/10 text-crimson border-crimson/30',
  ochre: 'bg-ochre/10 text-[#7a5516] border-ochre/40',
  olive: 'bg-olive/10 text-olive border-olive/30',
  neutral: 'bg-beige/60 text-charcoal border-beige',
  wine: 'bg-wine text-cream border-wine',
};

export function Badge({ tone = 'neutral', children, className, mono = true }: { tone?: Tone; children: ReactNode; className?: string; mono?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider', mono && 'font-mono', T[tone], className)}>
      {children}
    </span>
  );
}

export const severityTone = (s: string): Tone => (s === 'high' ? 'red' : s === 'medium' ? 'ochre' : s === 'low' ? 'neutral' : 'neutral');
