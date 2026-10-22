import { api } from '../api/client';
import { invalidate } from '../hooks/useApi';
import type { AnalysisResponse, ModelKey, SampleArticle } from '../types/api';

export async function analyzeSample(s: SampleArticle, model: ModelKey = 'auto', useLlm = false, signal?: AbortSignal): Promise<AnalysisResponse> {
  const r = await api.analyze({ title: s.title, body: s.body, author: s.author, source_url: s.source_url, model, use_llm: useLlm }, signal);
  invalidate('stats');
  invalidate('history');
  return r;
}
