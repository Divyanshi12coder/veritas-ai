import { useState } from 'react';
import { PlayCircle } from 'lucide-react';
import { api, errorMessage } from '../../api/client';
import { analyzeSample } from '../../lib/analyzeFlow';
import { Button } from '../ui/Button';
import { EmptyState, InlineAlert } from '../ui/EmptyState';

/** Honest empty state: runs every backend sample through the real API, sequentially. */
export function Populate({ onDone }: { onDone: () => void }) {
  const [run, setRun] = useState<{ i: number; n: number; title: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const go = async () => {
    setErr(null);
    try {
      const samples = await api.samples();
      if (!samples.length) { setErr('The backend has no sample articles configured.'); return; }
      for (let i = 0; i < samples.length; i++) {
        setRun({ i: i + 1, n: samples.length, title: samples[i].title });
        await analyzeSample(samples[i]);
      }
    } catch (e) { setErr(errorMessage(e)); }
    setRun(null);
    onDone();
  };

  return (
    <div className="space-y-4">
      <EmptyState title="No analyses yet" action={<Button loading={!!run} icon={<PlayCircle className="h-4 w-4" />} onClick={go}>Analyze all sample articles</Button>}>
        The dashboard shows only real results. Analyze an article, or run the built-in samples through the live pipeline to populate it.
        {run && <p className="num mt-3 text-wine" role="status">Running sample {run.i} of {run.n}: {run.title}</p>}
      </EmptyState>
      {err && <InlineAlert title="Could not finish">{err}</InlineAlert>}
    </div>
  );
}
