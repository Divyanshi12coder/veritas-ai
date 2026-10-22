import { api } from '../api/client';
import { useApi } from './useApi';
import type { Health } from '../types/api';
import { asBool } from '../lib/format';

export function useHealth() {
  const s = useApi<Health>('health', (sig) => api.health(sig));
  const llmConfigured = asBool(s.data?.llm['configured']) ?? false;
  return { ...s, offline: !!s.error && !s.data, llmConfigured };
}
