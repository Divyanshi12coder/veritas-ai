import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cx } from '../../lib/format';

interface Props {
  title: ReactNode;
  kicker?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  meta?: ReactNode;
  variant?: 'section' | 'plain';
  id?: string;
}

export function Accordion({ title, kicker, defaultOpen = false, children, meta, variant = 'section', id }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const uid = useId();
  const panel = `${uid}-panel`;
  return (
    <section id={id} className={cx(variant === 'section' ? 'rounded-lg border border-beige bg-white shadow-card' : 'border-b border-beige')}>
      <h3 className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panel}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        >
          <span className="min-w-0">
            {kicker && <span className="kicker block">{kicker}</span>}
            <span className={cx('block font-serif font-bold text-wine', variant === 'section' ? 'text-xl sm:text-2xl' : 'text-base font-sans font-semibold')}>{title}</span>
          </span>
          <span className="flex shrink-0 items-center gap-3">
            {meta}
            <ChevronDown className={cx('h-5 w-5 text-crimson transition-transform duration-300', open && 'rotate-180')} aria-hidden />
          </span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panel}
            role="region"
            key="c"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="border-t border-beige px-5 pb-6 pt-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
