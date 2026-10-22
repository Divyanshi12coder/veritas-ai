/** Documented default credibility weights (methodology constants, not analysis results). */
export const FACTORS = [
  { key: 'linguistic', label: 'Linguistic reliability', weight: 0.2, note: 'Calm, attributed, non-absolutist writing scores higher.' },
  { key: 'source', label: 'Source credibility', weight: 0.2, note: 'Domain tier and transparent source checks.' },
  { key: 'evidence', label: 'Evidence strength', weight: 0.2, note: 'How well extracted claims are supported by retrieved evidence.' },
  { key: 'sensationalism', label: 'Sensationalism (inverted)', weight: 0.15, note: 'Lower sensationalism raises the score.' },
  { key: 'consistency', label: 'Consistency', weight: 0.1, note: 'Agreement across available models and signals.' },
  { key: 'model', label: 'Model assessment', weight: 0.15, note: 'One minus the classifier P(fake).' },
] as const;
