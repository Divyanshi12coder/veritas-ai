import { useState } from 'react';
import type { FormEvent } from 'react';
import { Globe } from 'lucide-react';
import { Button } from '../ui/Button';
import type { AnalyzeUrlRequest } from '../../types/api';
import type { Options } from './OptionsBar';

export function UrlForm({ options, busy, onSubmit }: { options: Options; busy: boolean; onSubmit: (r: AnalyzeUrlRequest) => void }) {
  const [url, setUrl] = useState('');
  const valid = /^https?:\/\/\S{4,}$/i.test(url.trim());
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (valid) onSubmit({ url: url.trim(), model: options.model, use_llm: options.useLlm });
  };
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="url" className="label">Article URL *</label>
        <input id="url" type="url" className="field" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/news/story" required />
        <p className="mt-1 text-xs text-charcoal/60">The backend fetches the page and extracts the article text. Paywalled or script-rendered pages may fail — paste the text instead in that case.</p>
      </div>
      <Button type="submit" size="lg" loading={busy} disabled={!valid} icon={<Globe className="h-4 w-4" />}>Fetch and analyze</Button>
    </form>
  );
}
