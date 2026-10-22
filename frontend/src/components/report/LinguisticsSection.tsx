import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import type { Linguistics } from '../../types/api';
import { scoreColor } from '../../lib/format';

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border border-beige bg-cream/60 p-3" title={hint}>
      <p className="font-mono text-[10px] uppercase tracking-wider text-charcoal/60">{label}</p>
      <p className="num mt-1 text-xl font-semibold text-wine">{value}</p>
    </div>
  );
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));

export function LinguisticsSection({ l }: { l: Linguistics }) {
  const radar = [
    { k: 'Sensational', v: clamp(l.sensationalism_score) },
    { k: 'Subjective', v: clamp(l.subjectivity * 100) },
    { k: 'Emotive', v: clamp(l.emotive_word_ratio * 100 * 5) },
    { k: 'Caps', v: clamp(l.caps_word_ratio * 100 * 5) },
    { k: 'Negativity', v: clamp(l.sentiment_negative * 100) },
    { k: 'Absolutist', v: clamp((l.absolutist_terms / Math.max(1, l.sentence_count)) * 100) },
  ];
  const sens = clamp(l.sensationalism_score);
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-baseline justify-between">
          <h4 className="text-lg font-bold">Sensationalism meter</h4>
          <span className="num text-sm">{Math.round(sens)}/100</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-sm bg-beige" role="img" aria-label={`Sensationalism ${Math.round(sens)} out of 100`}>
          <motion.div className="h-full" style={{ background: scoreColor(100 - sens) }} initial={{ width: 0 }} whileInView={{ width: `${sens}%` }} viewport={{ once: true }} transition={{ duration: 0.9 }} />
        </div>
        <div className="mt-1 flex justify-between font-mono text-[10px] uppercase tracking-wider text-charcoal/50"><span>Measured</span><span>Sensational</span></div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Tile label="Words" value={String(l.word_count)} />
          <Tile label="Sentences" value={String(l.sentence_count)} />
          <Tile label="Avg sentence" value={`${l.avg_sentence_length.toFixed(1)} w`} />
          <Tile label="Reading ease" value={l.flesch_reading_ease.toFixed(0)} hint="Flesch reading ease: higher is easier" />
          <Tile label="Grade level" value={l.flesch_kincaid_grade.toFixed(1)} hint={l.reading_level} />
          <Tile label="Reading level" value={l.reading_level} />
          <Tile label="Lexical diversity" value={l.lexical_diversity.toFixed(2)} />
          <Tile label="Sentiment" value={`${l.sentiment_label} (${l.sentiment_compound.toFixed(2)})`} />
          <Tile label="Subjectivity" value={l.subjectivity.toFixed(2)} />
          <Tile label="ALL-CAPS words" value={`${(l.caps_word_ratio * 100).toFixed(1)}%`} />
          <Tile label="Exclamations" value={String(l.exclamation_count)} />
          <Tile label="Questions" value={String(l.question_count)} />
          <Tile label="Emotive words" value={`${(l.emotive_word_ratio * 100).toFixed(1)}%`} />
          <Tile label="Suspicious phrases" value={String(l.suspicious_phrase_count)} />
          <Tile label="Attribution cues" value={String(l.attribution_cues)} hint="e.g. 'according to', 'said'" />
          <Tile label="Hedging cues" value={String(l.hedging_cues)} />
          <Tile label="Absolutist terms" value={String(l.absolutist_terms)} />
        </div>
        <div>
          <p className="kicker mb-1 text-center">Style profile (scaled 0-100)</p>
          <div role="img" aria-label="Radar chart of style indicators" className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar} outerRadius="72%">
                <PolarGrid stroke="#E8DCC8" />
                <PolarAngleAxis dataKey="k" tick={{ fontSize: 11, fill: '#2A2326' }} />
                <Radar dataKey="v" stroke="#8B1E2D" fill="#8B1E2D" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
