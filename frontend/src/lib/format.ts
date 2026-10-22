import type { VerdictLabel } from '../types/api';

export const pct = (v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`;
export const num = (v: number, digits = 1) => (Number.isInteger(v) ? String(v) : v.toFixed(digits));

export function fmtDate(iso: string, withTime = true): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, withTime
    ? { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { year: 'numeric', month: 'short', day: 'numeric' });
}

export function dateline(): string {
  return new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase();
}

export const LABEL_TEXT: Record<VerdictLabel, string> = {
  likely_misinformation: 'Likely misinformation',
  uncertain: 'Uncertain — mixed signals',
  likely_reliable: 'Likely reliable',
};
export const LABEL_SHORT: Record<VerdictLabel, string> = {
  likely_misinformation: 'Misinformation',
  uncertain: 'Uncertain',
  likely_reliable: 'Reliable',
};
export const LABEL_COLOR: Record<VerdictLabel, string> = {
  likely_misinformation: '#8B1E2D',
  uncertain: '#A9782C',
  likely_reliable: '#4F5D3A',
};
export function scoreColor(score: number): string {
  return score >= 65 ? '#4F5D3A' : score >= 40 ? '#A9782C' : '#8B1E2D';
}
export function toLabel(s: string): VerdictLabel | null {
  return s === 'likely_misinformation' || s === 'uncertain' || s === 'likely_reliable' ? s : null;
}
export const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');
export const asNumber = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined);
export const asString = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
export const asBool = (v: unknown): boolean | undefined => (typeof v === 'boolean' ? v : undefined);
export const MODEL_LABELS: Record<string, string> = {
  auto: 'Auto (best available)',
  tfidf_lr: 'TF-IDF + Logistic Regression',
  tfidf_svm: 'TF-IDF + Linear SVM',
  stylometric_rf: 'Stylometric Random Forest',
  stylometric_hgb: 'Stylometric Gradient Boosting',
  transformer: 'Transformer',
};
