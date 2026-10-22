import { useId, useState } from 'react';
import type { ReactNode } from 'react';

/** Hover/focus tooltip. Wrapper is focusable only when `focusable` (for disabled controls). */
export function Tooltip({ text, children, focusable = false, side = 'top' }: { text: string; children: ReactNode; focusable?: boolean; side?: 'top' | 'bottom' }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={focusable ? 0 : undefined}
      aria-describedby={open ? id : undefined}
    >
      {children}
      {open && (
        <span
          id={id}
          role="tooltip"
          className={`pointer-events-none absolute left-1/2 z-50 w-max max-w-[260px] -translate-x-1/2 rounded bg-wine px-2.5 py-1.5 text-center text-xs font-normal normal-case leading-snug tracking-normal text-cream shadow-clip ${side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}
        >
          {text}
        </span>
      )}
    </span>
  );
}
