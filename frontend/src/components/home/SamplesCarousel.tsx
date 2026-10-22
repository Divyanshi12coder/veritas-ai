import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { api, errorMessage } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { analyzeSample } from '../../lib/analyzeFlow';
import { SectionHeading } from '../ui/SectionHeading';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { InlineAlert } from '../ui/EmptyState';
import { useToast } from '../ui/Toast';
import type { SampleArticle } from '../../types/api';

export function SamplesCarousel() {
  const { data, loading, error, reload } = useApi<SampleArticle[]>('samples', (s) => api.samples(s));
  const [busyId, setBusyId] = useState<string | null>(null);
  const track = useRef<HTMLUListElement>(null);
  const nav = useNavigate();
  const toast = useToast();

  const scroll = (dir: 1 | -1) => track.current?.scrollBy({ left: dir * (track.current.clientWidth * 0.8), behavior: 'smooth' });
  const run = async (s: SampleArticle) => {
    setBusyId(s.id);
    try { const r = await analyzeSample(s); nav(`/analysis/${r.id}`); }
    catch (e) { toast.push('error', errorMessage(e)); setBusyId(null); }
  };

  return (
    <section className="container-x py-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading kicker="Try it now" title="Run a sample through the live pipeline" intro="Each button sends the article to the real backend and opens the full report." />
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" aria-label="Previous samples" onClick={() => scroll(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="secondary" size="sm" aria-label="Next samples" onClick={() => scroll(1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="mt-8">
        {loading && <div className="flex gap-4"><Skeleton className="h-56 w-80 shrink-0" /><Skeleton className="h-56 w-80 shrink-0" /></div>}
        {error && <InlineAlert title="Samples unavailable" action={<Button size="sm" variant="secondary" onClick={reload}>Retry</Button>}>{error.message}</InlineAlert>}
        {data && (
          <ul ref={track} className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4" tabIndex={0} aria-label="Sample articles">
            {data.map((s) => (
              <li key={s.id} className="flex w-[82%] shrink-0 snap-start flex-col justify-between rounded-lg border border-beige bg-white p-5 shadow-card sm:w-80">
                <div>
                  <p className="kicker">Sample article</p>
                  <h3 className="mt-1 text-xl font-bold leading-snug">{s.title}</h3>
                  <p className="mt-2 line-clamp-4 text-sm text-charcoal/75">{s.description}</p>
                </div>
                <Button className="mt-4 self-start" size="sm" loading={busyId === s.id} disabled={busyId !== null} icon={<Play className="h-3.5 w-3.5" />} onClick={() => run(s)}>Analyze this sample</Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
