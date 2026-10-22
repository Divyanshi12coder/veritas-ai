import { Play } from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { InlineAlert } from '../ui/EmptyState';
import type { SampleArticle } from '../../types/api';

export function SamplesList({ busy, onRun }: { busy: boolean; onRun: (s: SampleArticle) => void }) {
  const { data, loading, error, reload } = useApi<SampleArticle[]>('samples', (s) => api.samples(s));
  if (loading) return <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>;
  if (error) return <InlineAlert title="Could not load samples" action={<Button size="sm" variant="secondary" onClick={reload}>Retry</Button>}>{error.message}</InlineAlert>;
  if (!data?.length) return <p className="text-sm text-charcoal/70">The backend has no sample articles configured.</p>;
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {data.map((s) => (
        <li key={s.id} className="flex flex-col justify-between rounded-md border border-beige bg-white p-4">
          <div>
            <h4 className="font-serif text-lg font-bold leading-snug">{s.title}</h4>
            <p className="mt-1 text-sm text-charcoal/75">{s.description}</p>
            <p className="num mt-2 text-xs text-charcoal/50">{s.body.split(/\s+/).length} words{s.author ? ` · ${s.author}` : ''}</p>
          </div>
          <Button className="mt-3 self-start" size="sm" variant="secondary" disabled={busy} icon={<Play className="h-3.5 w-3.5" />} onClick={() => onRun(s)}>Analyze this sample</Button>
        </li>
      ))}
    </ul>
  );
}
