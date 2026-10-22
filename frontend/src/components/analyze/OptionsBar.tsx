import { Tooltip } from '../ui/Tooltip';
import { MODEL_LABELS, cx } from '../../lib/format';
import type { ModelInfo, ModelKey } from '../../types/api';

export interface Options { model: ModelKey; useLlm: boolean }

interface Props { value: Options; onChange: (o: Options) => void; info: ModelInfo | undefined; llmConfigured: boolean }

export function OptionsBar({ value, onChange, info, llmConfigured }: Props) {
  const keys: ModelKey[] = ['auto', 'tfidf_lr', 'tfidf_svm', 'stylometric_rf', 'stylometric_hgb', 'transformer'];
  const avail = (k: ModelKey) => (k === 'auto' ? true : info ? !!info.models.find((m) => m.key === k)?.available : false);
  const llmOn = llmConfigured && value.useLlm;
  return (
    <div className="grid gap-4 rounded-md border border-beige bg-cream/70 p-4 sm:grid-cols-2">
      <div>
        <label htmlFor="model-select" className="label">Model</label>
        <select id="model-select" className="field" value={value.model} onChange={(e) => onChange({ ...value, model: e.target.value as ModelKey })}>
          {keys.map((k) => (
            <option key={k} value={k} disabled={!avail(k)}>
              {(info?.models.find((m) => m.key === k)?.label ?? MODEL_LABELS[k])}{avail(k) ? '' : ' (not available)'}
            </option>
          ))}
        </select>
      </div>
      <div>
        <span className="label">Reasoning</span>
        <Tooltip text="Optional — set an API key on the backend" focusable={!llmConfigured}>
          <label className={cx('flex items-center gap-3 rounded-md border border-beige bg-white px-3.5 py-2.5 text-sm', llmConfigured ? 'cursor-pointer' : 'cursor-not-allowed opacity-60')}>
            <input
              type="checkbox"
              role="switch"
              className="h-4 w-4 accent-[#8B1E2D]"
              checked={llmOn}
              disabled={!llmConfigured}
              onChange={(e) => onChange({ ...value, useLlm: e.target.checked })}
            />
            Use LLM reasoning
          </label>
        </Tooltip>
      </div>
    </div>
  );
}
