import { useState } from 'react';
import type { FormEvent } from 'react';
import { Send } from 'lucide-react';
import { Button } from '../ui/Button';
import type { AnalyzeRequest } from '../../types/api';
import type { Options } from './OptionsBar';

interface Props { options: Options; busy: boolean; onSubmit: (r: AnalyzeRequest) => void }

export function PasteForm({ options, busy, onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [author, setAuthor] = useState('');
  const [url, setUrl] = useState('');
  const bodyOk = body.trim().length >= 80;
  const titleOk = title.trim().length >= 3;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!bodyOk || !titleOk) return;
    onSubmit({ title: title.trim(), body: body.trim(), author: author.trim() || null, source_url: url.trim() || null, model: options.model, use_llm: options.useLlm });
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="title" className="label">Headline *</label>
        <input id="title" className="field" value={title} maxLength={300} onChange={(e) => setTitle(e.target.value)} placeholder="Article headline" required />
      </div>
      <div>
        <label htmlFor="body" className="label">Article text * <span className="normal-case tracking-normal text-charcoal/50">(min 80 characters)</span></label>
        <textarea id="body" className="field min-h-[220px] font-text leading-relaxed" value={body} maxLength={60000} onChange={(e) => setBody(e.target.value)} placeholder="Paste the full article body here…" required />
        <p className={`num mt-1 text-xs ${bodyOk || !body ? 'text-charcoal/50' : 'text-crimson'}`}>{body.trim().length.toLocaleString()} / 60,000 characters{!bodyOk && body ? ' — needs at least 80' : ''}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="author" className="label">Author (optional)</label>
          <input id="author" className="field" value={author} maxLength={200} onChange={(e) => setAuthor(e.target.value)} />
        </div>
        <div>
          <label htmlFor="srcurl" className="label">Source URL (optional)</label>
          <input id="srcurl" type="url" className="field" value={url} maxLength={2048} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </div>
      </div>
      <Button type="submit" size="lg" loading={busy} disabled={!bodyOk || !titleOk} icon={<Send className="h-4 w-4" />}>Analyze article</Button>
    </form>
  );
}
