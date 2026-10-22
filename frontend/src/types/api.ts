/** Mirrors backend/app/schemas.py exactly. */
export type VerdictLabel = 'likely_misinformation' | 'uncertain' | 'likely_reliable';
export type Assessment = 'supported' | 'contradicted' | 'unverified' | 'insufficient';
export type Severity = 'high' | 'medium' | 'low' | 'info';
export type ModelKey = 'auto' | 'tfidf_lr' | 'tfidf_svm' | 'stylometric_rf' | 'stylometric_hgb' | 'transformer';

export interface AnalyzeRequest {
  title: string;
  body: string;
  author?: string | null;
  source_url?: string | null;
  model: ModelKey;
  use_llm: boolean;
}
export interface AnalyzeUrlRequest {
  url: string;
  model: ModelKey;
  use_llm: boolean;
}

export interface ArticleInfo {
  title: string;
  body: string;
  author: string | null;
  source_url: string | null;
  domain: string | null;
  published_at: string | null;
  word_count: number;
  extracted_from_url: boolean;
}
export interface Verdict {
  label: VerdictLabel;
  display: string;
  p_fake: number;
  confidence: number;
  model_key: string;
  model_label: string;
  model_kind: string;
  note: string | null;
}
export interface CredibilityFactor {
  key: string;
  label: string;
  score: number | null;
  weight: number;
  effective_weight: number;
  available: boolean;
  description: string;
  detail: string | null;
}
export interface Credibility {
  score: number;
  band: string;
  factors: CredibilityFactor[];
  methodology: string;
}
export interface Signal { key: string; label: string; severity: Severity; detail: string }
export interface FeatureContribution {
  feature: string;
  contribution: number;
  kind: 'term' | 'style' | 'sentence';
  value: number | null;
}
export interface Highlight { text: string; kind: string; reason: string }
export interface KeywordScore { term: string; score: number }
export interface EntityMention { text: string; label: string; count: number }
export interface Explanation {
  method: string;
  note: string;
  top_fake_features: FeatureContribution[];
  top_real_features: FeatureContribution[];
  highlights: Highlight[];
  keywords: KeywordScore[];
  entities: EntityMention[];
}
export interface Linguistics {
  word_count: number;
  sentence_count: number;
  avg_sentence_length: number;
  lexical_diversity: number;
  flesch_reading_ease: number;
  flesch_kincaid_grade: number;
  reading_level: string;
  sentiment_positive: number;
  sentiment_negative: number;
  sentiment_compound: number;
  sentiment_label: string;
  subjectivity: number;
  caps_word_ratio: number;
  exclamation_count: number;
  question_count: number;
  emotive_word_ratio: number;
  suspicious_phrase_count: number;
  attribution_cues: number;
  hedging_cues: number;
  absolutist_terms: number;
  sensationalism_score: number;
}
export interface SourceCheck { label: string; passed: boolean | null; detail: string }
export interface SourceReport {
  domain: string | null;
  available: boolean;
  score: number | null;
  tier: string;
  name: string | null;
  notes: string[];
  checks: SourceCheck[];
}
export interface EvidenceItem {
  kb_id: string;
  title: string;
  statement: string;
  similarity: number;
  source_name: string;
  source_url: string | null;
  relation: 'matches_statement' | 'matches_known_false_claim';
}
export interface ClaimResult {
  id: number;
  text: string;
  kind: string;
  assessment: Assessment;
  confidence: number;
  rationale: string;
  evidence: EvidenceItem[];
}
export interface LLMRedFlag { category: string; description: string; quote: string | null; severity: Severity }
export interface LLMClaimReview { claim: string; assessment: string; reasoning: string }
export interface LLMAnalysis {
  status: 'ok' | 'disabled' | 'error';
  provider: string | null;
  model: string | null;
  message: string | null;
  summary: string | null;
  red_flags: LLMRedFlag[];
  missing_context: string[];
  claims_review: LLMClaimReview[];
  evidence_quality: string | null;
  uncertainty: string | null;
  disclaimer: string;
}
export interface ModelComparison { model_key: string; label: string; p_fake: number }
export interface AnalysisResponse {
  id: string;
  created_at: string;
  duration_ms: number;
  article: ArticleInfo;
  verdict: Verdict;
  credibility: Credibility;
  signals: Signal[];
  explanation: Explanation;
  linguistics: Linguistics;
  source: SourceReport;
  claims: ClaimResult[];
  llm: LLMAnalysis;
  models_compared: ModelComparison[];
  disclaimer: string;
}

export interface HistoryItem {
  id: string;
  title: string;
  domain: string | null;
  label: VerdictLabel;
  p_fake: number;
  confidence: number;
  credibility_score: number;
  model_key: string;
  created_at: string;
}
export interface HistoryPage { items: HistoryItem[]; total: number; limit: number; offset: number }
export interface Totals {
  analyzed: number;
  likely_misinformation: number;
  uncertain: number;
  likely_reliable: number;
  avg_credibility: number | null;
  avg_confidence: number | null;
}
export interface LabelCount { label: string; count: number }
export interface BucketCount { bucket: string; count: number }
export interface DailyPoint {
  date: string;
  count: number;
  avg_credibility: number | null;
  avg_sentiment: number | null;
  avg_suspicious_phrases: number | null;
  misinformation: number;
  reliable: number;
}
export interface SourceStat { domain: string; count: number; avg_credibility: number }
export interface PhraseStat { phrase: string; count: number }
export interface ModelUsage { model_key: string; count: number }
export interface Statistics {
  totals: Totals;
  distribution: LabelCount[];
  confidence_histogram: BucketCount[];
  credibility_histogram: BucketCount[];
  daily: DailyPoint[];
  sources: SourceStat[];
  model_usage: ModelUsage[];
  top_suspicious_phrases: PhraseStat[];
  recent: HistoryItem[];
}
export interface SampleArticle {
  id: string;
  title: string;
  body: string;
  author: string | null;
  source_url: string | null;
  description: string;
}
export interface KBEntry {
  id: string;
  title: string;
  topic: string;
  statement: string;
  common_false_claims: string[];
  source_name: string;
  source_url: string | null;
}
export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  roc_auc: number | null;
  confusion_matrix: number[][];
  roc_curve: number[][] | null;
  n_test: number;
}
export interface ModelCard {
  key: string;
  label: string;
  kind: string;
  description: string;
  available: boolean;
  is_default: boolean;
  explainability: string;
  metrics: ModelMetrics | null;
  validation_f1: number | null;
  trained_at: string | null;
}
export interface ModelInfo {
  models: ModelCard[];
  dataset: Record<string, unknown>;
  pipeline_steps: string[];
  transformer: Record<string, unknown>;
  caveats: string[];
}
export interface Health {
  status: 'ok' | 'degraded';
  version: string;
  database: string;
  models_loaded: string[];
  default_model: string | null;
  rag: Record<string, unknown>;
  llm: Record<string, unknown>;
  transformer: Record<string, unknown>;
}
