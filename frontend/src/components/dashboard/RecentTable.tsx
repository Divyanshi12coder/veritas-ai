import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search, Trash2 } from 'lucide-react';
import { api, errorMessage } from '../../api/client';
import { invalidate, useApi } from '../../hooks/useApi';
import { Badge } from '../ui/Badge';
import type { Tone } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Skeleton } from '../ui/Skeleton';
import { InlineAlert } from '../ui/EmptyState';
import { useToast } from '../ui/Toast';
import { LABEL_SHORT, cx, fmtDate, pct } from '../../lib/format';
import type { HistoryItem, HistoryPage, VerdictLabel } from '../../types/api';

const PAGE = 8;
const TONE: Record<VerdictLabel, Tone> = { likely_misinformation: 'red', uncertain: 'ochre', likely_reliable: 'olive' };
const CHIPS: Array<{ v: VerdictLabel | ''; l: string }> = [{ v: '', l: 'All' }, { v: 'likely_misinformation', l: 'Misinformation' }, { v: 'uncertain', l: 'Uncertain' }, { v: 'likely_reliable', l: 'Reliable' }];

export function RecentTable({ onChanged }: { onChanged: () => void }) {
  const [label, setLabel] = useState<VerdictLabel | ''>('');
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const [page, setPage] = useState(0);
  const [del, setDel] = useState<HistoryItem | null>(null);
  const toast = useToast();

  useEffect(() => { const t = setTimeout(() => { setDq(q.trim()); setPage(0); }, 300); return () => clearTimeout(t); }, [q]);
  const key = `history:${label}:${dq}:${page}`;
  const { data, loading, error, reload } = useApi<HistoryPage>(key, (s) => api.history({ limit: PAGE, offset: page * PAGE, label, q: dq }, s));
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE)) : 1;

  const confirmDelete = async () => {
    if (!del) return;
    try { await api.deleteAnalysis(del.id); invalidate(); toast.push('success', 'Analysis deleted.'); setDel(null); reload(); onChanged(); }
    catch (e) { toast.push('error', errorMessage(e)); setDel(null); }
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by verdict">
          {CHIPS.map((c) => (
            <button key={c.l} aria-pressed={label === c.v} onClick={() => { setLabel(c.v); setPage(0); }}
              className={cx('rounded-full border px-3 py-1 text-xs font-medium transition-colors', label === c.v ? 'border-wine bg-wine text-cream' : 'border-beige bg-white hover:bg-beige/60')}>{c.l}</button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/40" aria-hidden />
          <input className="field pl-9" type="search" placeholder="Search titles…" aria-label="Search analyses" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      {error && <InlineAlert title="Could not load history" action={<Button size="sm" variant="secondary" onClick={reload}>Retry</Button>}>{error.message}</InlineAlert>}
      {loading && <div className="space-y-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>}
      {data && !loading && (data.items.length === 0 ? (
        <p className="rounded border border-dashed border-wine/30 bg-cream px-4 py-8 text-center text-sm text-charcoal/70">No analyses match these filters.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-beige">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-cream font-mono text-[10px] uppercase tracking-wider text-charcoal/70">
              <tr><th className="px-3 py-2">Article</th><th className="px-3 py-2">Verdict</th><th className="px-3 py-2">Cred.</th><th className="px-3 py-2">Conf.</th><th className="px-3 py-2">When</th><th className="px-3 py-2"><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody className="divide-y divide-beige bg-white">
              {data.items.map((h) => (
                <tr key={h.id} className="hover:bg-cream/60">
                  <td className="max-w-[280px] px-3 py-2.5"><Link to={`/analysis/${h.id}`} className="line-clamp-2 font-medium text-wine hover:text-crimson hover:underline">{h.title}</Link>{h.domain && <span className="num text-xs text-charcoal/50">{h.domain}</span>}</td>
                  <td className="px-3 py-2.5"><Badge tone={TONE[h.label]}>{LABEL_SHORT[h.label]}</Badge></td>
                  <td className="num px-3 py-2.5">{h.credibility_score}</td>
                  <td className="num px-3 py-2.5">{pct(h.confidence)}</td>
                  <td className="num whitespace-nowrap px-3 py-2.5 text-xs text-charcoal/65">{fmtDate(h.created_at)}</td>
                  <td className="px-3 py-2.5 text-right"><button aria-label={`Delete ${h.title}`} onClick={() => setDel(h)} className="rounded p-1.5 text-charcoal/50 hover:bg-crimson/10 hover:text-crimson"><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {data && data.total > PAGE && (
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="num text-xs text-charcoal/60">{data.total} total · page {page + 1} of {pages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)} icon={<ChevronLeft className="h-4 w-4" />}>Prev</Button>
            <Button size="sm" variant="secondary" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next<ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
      <Modal open={!!del} onClose={() => setDel(null)} title="Delete this analysis?"
        footer={<><Button size="sm" variant="secondary" onClick={() => setDel(null)}>Cancel</Button><Button size="sm" variant="danger" onClick={confirmDelete}>Delete</Button></>}>
        “{del?.title}” will be removed permanently and statistics will update.
      </Modal>
    </div>
  );
}
