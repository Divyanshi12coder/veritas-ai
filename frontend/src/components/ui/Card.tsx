import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../../lib/format';

interface Props extends HTMLAttributes<HTMLDivElement> {
  tone?: 'white' | 'cream' | 'dark';
  padded?: boolean;
  children?: ReactNode;
}

export function Card({ tone = 'white', padded = true, className, children, ...rest }: Props) {
  const tones = {
    white: 'bg-white border-beige',
    cream: 'bg-cream border-beige',
    dark: 'bg-wine text-cream border-burgundy',
  } as const;
  return (
    <div className={cx('rounded-lg border shadow-card', tones[tone], padded && 'p-5 sm:p-6', className)} {...rest}>
      {children}
    </div>
  );
}
