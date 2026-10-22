import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Link2, Trash2 } from 'lucide-react';
import { api, errorMessage } from '../api/client';
import { invalidate, useApi } from '../hooks/useApi';
import { AnalysisReport } from '../components/report/AnalysisReport';
import { ReportSkeleton } from '../components/ui/Skeleton';
import { InlineAlert } from '../components/ui/EmptyState';
import { Button, LinkButton } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import type { AnalysisResponse } from '../types/api';

export default function AnalysisPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { data, error, loading, reload } = useApi<AnalysisResponse>(id ? `analysis:${id}` : null, (s) => api.getAnalysis(id, s));
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const copy = async () => {
    try { await navigator.clipboard.writeText(window.location.href); toast.push('success', 'Link copied to clipboard.'); }
    catch { toast.push('error', 'Could not copy automatically — copy the address bar URL.'); }
  };
  const del = async () => {
    setBusy(true);
    try {
      await api.deleteAnalysis(id);
      invalidate();
      toast.push('success', 'Analysis deleted.');
      nav('/dashboard');
    } catch (e) { toast.push('error', errorMessage(e)); setBusy(false); setConfirm(false); }
  };

  return (
    <div className="container-x py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link to="/dashboard" className="text-sm text-crimson hover:underline">← Back to dashboard</Link>
        {data && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<Link2 className="h-4 w-4" />} onClick={copy}>Copy link</Button>
            <Button variant="ghost" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirm(true)}>Delete</Button>
          </div>
        )}
      </div>
      {loading && <ReportSkeleton />}
      {error && !loading && (
        <InlineAlert title={error.message.toLowerCase().includes('not found') ? 'Analysis not found' : 'Could not load this analysis'}
          action={<div className="flex gap-2"><Button size="sm" variant="secondary" onClick={reload}>Retry</Button><LinkButton to="/analyze" size="sm">New analysis</LinkButton></div>}>
          {error.message}
        </InlineAlert>
      )}
      {data && <AnalysisReport a={data} />}
      <Modal open={confirm} onClose={() => setConfirm(false)} title="Delete this analysis?"
        footer={<><Button variant="secondary" size="sm" onClick={() => setConfirm(false)}>Cancel</Button><Button variant="danger" size="sm" loading={busy} onClick={del}>Delete permanently</Button></>}>
        This removes the stored analysis and updates the dashboard statistics. This cannot be undone.
      </Modal>
    </div>
  );
}
