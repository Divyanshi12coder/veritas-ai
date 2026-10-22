import type { ReactNode } from 'react';
import { Newspaper } from 'lucide-react';

export function EmptyState({ title, children, action, icon }: { title: string; children?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-wine/30 bg-cream/60 px-6 py-12 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-beige text-wine">{icon ?? <Newspaper className="h-6 w-6" />}</div>
      <h3 className="text-xl font-bold">{title}</h3>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-charcoal/75">{children}</div>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}

export function InlineAlert({ title, children, tone = 'error', action }: { title?: string; children: ReactNode; tone?: 'error' | 'info'; action?: ReactNode }) {
  return (
    <div role="alert" className={`rounded-md border-l-4 px-4 py-3 text-sm ${tone === 'error' ? 'border-crimson bg-crimson/5 text-wine' : 'border-ochre bg-ochre/10 text-charcoal'}`}>
      {title && <p className="font-semibold">{title}</p>}
      <div>{children}</div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
