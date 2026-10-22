import { useCallback, useEffect, useRef, useState } from 'react';

interface Entry { data: unknown; at: number }
const cache = new Map<string, Entry>();
const TTL = 30_000;

export function invalidate(prefix?: string) {
  for (const k of [...cache.keys()]) if (!prefix || k.startsWith(prefix)) cache.delete(k);
}

export interface ApiState<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
  reload: () => void;
}

/** Tiny stale-while-revalidate hook. `key` identifies the cache entry. */
export function useApi<T>(key: string | null, fetcher: (signal: AbortSignal) => Promise<T>): ApiState<T> {
  const cached = key ? cache.get(key) : undefined;
  const [data, setData] = useState<T | undefined>(cached?.data as T | undefined);
  const [error, setError] = useState<Error | undefined>();
  const [loading, setLoading] = useState<boolean>(!!key && !cached);
  const [tick, setTick] = useState(0);
  const fetchRef = useRef(fetcher);
  fetchRef.current = fetcher;

  useEffect(() => {
    if (!key) { setData(undefined); setLoading(false); return; }
    const hit = cache.get(key);
    setData(hit ? (hit.data as T) : undefined);
    if (hit && Date.now() - hit.at < TTL && tick === 0) { setLoading(false); return; }
    const ctrl = new AbortController();
    setLoading(!hit);
    setError(undefined);
    fetchRef.current(ctrl.signal)
      .then((d) => { cache.set(key, { data: d, at: Date.now() }); setData(d); setLoading(false); })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(e instanceof Error ? e : new Error(String(e)));
        setLoading(false);
      });
    return () => ctrl.abort();
  }, [key, tick]);

  const reload = useCallback(() => { if (key) cache.delete(key); setTick((t) => t + 1); }, [key]);
  return { data, error, loading, reload };
}
