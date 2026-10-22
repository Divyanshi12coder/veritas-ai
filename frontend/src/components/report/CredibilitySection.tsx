import { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Tooltip } from '../ui/Tooltip';
import { scoreColor } from '../../lib/format';
import type { Credibility } from '../../types/api';

export function CredibilitySection({ c }: { c: Credibility }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <ul className="space-y-5">
        {c.factors.map((f) => (
          <li key={f.key}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <Tooltip text={f.description} focusable side="bottom">
                <span className="cursor-help border-b border-dotted border-wine/50 font-serif text-lg font-bold text-wine">{f.label}</span>
              </Tooltip>
              <span className="num text-xs text-charcoal/60">
                weight {(f.weight * 100).toFixed(0)}%{f.available ? ` → effective ${(f.effective_weight * 100).toFixed(1)}%` : ''}
              </span>
            </div>
            {f.available && f.score != null ? (
              <div className="mt-1.5 flex items-center gap-3">
                <div className="h-3 flex-1 overflow-hidden rounded-sm bg-beige" role="img" aria-label={`${f.label}: ${Math.round(f.score)} of 100`}>
                  <motion.div className="h-full" style={{ background: scoreColor(f.score) }} initial={{ width: 0 }} whileInView={{ width: `${Math.max(0, Math.min(100, f.score))}%` }} viewport={{ once: true }} transition={{ duration: 0.9, ease: 'easeOut' }} />
                </div>
                <span className="num w-10 text-right text-sm font-medium">{Math.round(f.score)}</span>
              </div>
            ) : (
              <p className="mt-1.5 rounded border border-dashed border-wine/30 bg-cream px-3 py-1.5 text-xs text-charcoal/70">
                Unavailable for this article — its weight was redistributed across the other factors.
              </p>
            )}
            {f.detail && <p className="mt-1.5 text-xs text-charcoal/65">{f.detail}</p>}
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-beige pt-4">
        <p className="text-sm text-charcoal/75">Final score: <strong className="num text-wine">{c.score}/100</strong> · {c.band}</p>
        <Button variant="secondary" size="sm" icon={<BookOpen className="h-4 w-4" />} onClick={() => setOpen(true)}>How this score was calculated</Button>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="How this score was calculated" wide footer={<Button size="sm" onClick={() => setOpen(false)}>Close</Button>}>
        <p className="whitespace-pre-line font-text text-base leading-relaxed">{c.methodology}</p>
      </Modal>
    </div>
  );
}
