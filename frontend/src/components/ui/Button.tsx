import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cx } from '../../lib/format';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const V: Record<Variant, string> = {
  primary: 'bg-crimson text-paper hover:bg-burgundy shadow-card border border-burgundy',
  secondary: 'bg-white text-wine border border-wine/40 hover:bg-cream',
  ghost: 'bg-transparent text-wine hover:bg-beige/60 border border-transparent',
  danger: 'bg-wine text-paper hover:bg-crimson border border-wine',
};
const S: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3.5 text-[15px] gap-2.5',
};

interface Common { variant?: Variant; size?: Size; icon?: ReactNode; className?: string; children?: ReactNode }
type BtnProps = Common & ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean };

const base = 'inline-flex items-center justify-center rounded-md font-medium tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50';

export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { variant = 'primary', size = 'md', icon, loading, className, children, disabled, type = 'button', ...rest }, ref,
) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} className={cx(base, V[variant], S[size], className)} {...rest}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export function LinkButton({ to, variant = 'primary', size = 'md', icon, className, children }: Common & { to: string }) {
  return (
    <Link to={to} className={cx(base, V[variant], S[size], className)}>
      {icon}
      {children}
    </Link>
  );
}
