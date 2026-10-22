import { useMemo } from 'react';
import { Tooltip } from '../ui/Tooltip';
import { segmentText } from '../../lib/highlight';
import type { Highlight } from '../../types/api';

/** Renders article text with highlighted phrases as real React nodes (no innerHTML). */
export function HighlightedText({ text, highlights }: { text: string; highlights: Highlight[] }) {
  const segs = useMemo(() => segmentText(text, highlights), [text, highlights]);
  return (
    <div className="max-h-[420px] overflow-y-auto rounded-md border border-beige bg-paper p-4 font-text text-[15px] leading-7 [overflow-wrap:anywhere]">
      <p className="whitespace-pre-wrap">
        {segs.map((s, i) =>
          s.highlight ? (
            <Tooltip key={i} text={`${s.highlight.kind}: ${s.highlight.reason}`} focusable>
              <mark className="cursor-help rounded-sm bg-crimson/15 px-0.5 text-wine underline decoration-crimson decoration-wavy decoration-1 underline-offset-4">{s.text}</mark>
            </Tooltip>
          ) : (
            <span key={i}>{s.text}</span>
          ),
        )}
      </p>
    </div>
  );
}
