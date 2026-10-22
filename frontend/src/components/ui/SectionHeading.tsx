import type { ReactNode } from 'react';
import { cx } from '../../lib/format';

interface Props { kicker: string; title: ReactNode; intro?: ReactNode; align?: 'left' | 'center'; as?: 'h1' | 'h2'; className?: string }

export function SectionHeading({ kicker, title, intro, align = 'left', as: H = 'h2', className }: Props) {
  return (
    <header className={cx('max-w-3xl', align === 'center' && 'mx-auto text-center', className)}>
      <p className="kicker">{kicker}</p>
      <div className={cx('mt-2 h-[7px] w-full border-y border-wine/70', align === 'center' && 'mx-auto')} aria-hidden style={{ maxWidth: 120, marginInline: align === 'center' ? 'auto' : undefined }} />
      <H className={cx('mt-4 font-bold leading-[1.1]', H === 'h1' ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl')}>{title}</H>
      {intro && <p className="mt-4 font-text text-lg leading-relaxed text-charcoal/80">{intro}</p>}
    </header>
  );
}
