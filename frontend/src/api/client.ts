import type {
  AnalysisResponse, AnalyzeRequest, AnalyzeUrlRequest, Health, HistoryPage, KBEntry,
  ModelInfo, SampleArticle, Statistics, VerdictLabel,
} from '../types/api';

const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function detailToMessage(detail: unknown): string | null {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const parts = detail.map((d) => {
      if (d && typeof d === 'object') {
        const o = d as { loc?: unknown[]; msg?: string };
        const field = Array.isArray(o.loc) ? o.loc.filter((l) => l !== 'body').join('.') : '';
        return field ? `${field}: ${o.msg ?? 'invalid'}` : (o.msg ?? 'invalid');
      }
      return String(d);
    });
    return parts.join('; ');
  }
  return null;
}

async function request<T>(path: string, init: RequestInit = {}, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      ...init,
      signal,
      headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new ApiError('Backend unreachable — start the API server (see Docs).', 0);
  }
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { detail?: unknown };
      msg = detailToMessage(body.detail) ?? msg;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(msg, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface HistoryQuery { limit?: number; offset?: number; label?: VerdictLabel | ''; q?: string }

export const api = {
  analyze: (b: AnalyzeRequest, s?: AbortSignal) => request<AnalysisResponse>('/analyze', { method: 'POST', body: JSON.stringify(b) }, s),
  analyzeUrl: (b: AnalyzeUrlRequest, s?: AbortSignal) => request<AnalysisResponse>('/analyze/url', { method: 'POST', body: JSON.stringify(b) }, s),
  getAnalysis: (id: string, s?: AbortSignal) => request<AnalysisResponse>(`/analysis/${encodeURIComponent(id)}`, {}, s),
  deleteAnalysis: (id: string) => request<void>(`/analysis/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  history: (q: HistoryQuery, s?: AbortSignal) => {
    const p = new URLSearchParams();
    if (q.limit != null) p.set('limit', String(q.limit));
    if (q.offset != null) p.set('offset', String(q.offset));
    if (q.label) p.set('label', q.label);
    if (q.q) p.set('q', q.q);
    return request<HistoryPage>(`/history?${p.toString()}`, {}, s);
  },
  statistics: (s?: AbortSignal) => request<Statistics>('/statistics', {}, s),
  health: (s?: AbortSignal) => request<Health>('/health', {}, s),
  modelInfo: (s?: AbortSignal) => request<ModelInfo>('/model-info', {}, s),
  samples: (s?: AbortSignal) => request<SampleArticle[]>('/samples', {}, s),
  kb: (s?: AbortSignal) => request<KBEntry[]>('/kb', {}, s),
};

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong.';
}
