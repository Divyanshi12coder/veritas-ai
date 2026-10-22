import type { KeyboardEvent, ReactNode } from 'react';
import { cx } from '../../lib/format';

export interface TabDef<K extends string> { key: K; label: string; icon?: ReactNode }

export function Tabs<K extends string>({ tabs, value, onChange, label }: { tabs: TabDef<K>[]; value: K; onChange: (k: K) => void; label: string }) {
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    onChange(n.key);
    document.getElementById(`tab-${n.key}`)?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b-2 border-wine/80">
      {tabs.map((t, i) => (
        <button
          key={t.key}
          id={`tab-${t.key}`}
          role="tab"
          aria-selected={value === t.key}
          tabIndex={value === t.key ? 0 : -1}
          onClick={() => onChange(t.key)}
          onKeyDown={(e) => onKey(e, i)}
          className={cx(
            'flex shrink-0 items-center gap-2 rounded-t-md px-4 py-2.5 font-mono text-xs font-medium uppercase tracking-wider transition-colors',
            value === t.key ? 'bg-wine text-cream' : 'text-charcoal/70 hover:bg-beige/70',
          )}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}
