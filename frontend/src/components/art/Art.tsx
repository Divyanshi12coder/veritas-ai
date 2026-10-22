import { useId } from 'react';

/** Newspaper stack with a magnifier. Red / beige only. */
export function NewspaperMagnifier({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 260" className={className} role="img" aria-label="Illustration: a stack of newspapers under a magnifying glass">
      <g transform="rotate(-4 120 140)"><rect x="40" y="70" width="180" height="150" rx="4" fill="#E8DCC8" stroke="#6B1D2A" strokeWidth="1.5" /></g>
      <g transform="rotate(3 130 140)"><rect x="52" y="58" width="180" height="150" rx="4" fill="#F6EFE3" stroke="#6B1D2A" strokeWidth="1.5" /></g>
      <rect x="62" y="48" width="180" height="150" rx="4" fill="#FBF8F3" stroke="#4A1220" strokeWidth="1.8" />
      <rect x="74" y="60" width="156" height="22" fill="#4A1220" />
      <rect x="82" y="68" width="80" height="6" rx="1" fill="#F6EFE3" />
      <rect x="74" y="90" width="72" height="44" fill="#E8DCC8" />
      <path d="M74 134 L96 108 L112 124 L128 100 L146 134Z" fill="#9E2A3A" opacity=".75" />
      {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x="154" y={92 + i * 8} width={i % 3 === 2 ? 52 : 76} height="3" rx="1" fill="#2A2326" opacity=".45" />)}
      {[0, 1, 2, 3, 4].map((i) => <rect key={i} x="74" y={144 + i * 8} width={i === 4 ? 70 : 156} height="3" rx="1" fill="#2A2326" opacity=".35" />)}
      <circle cx="226" cy="150" r="42" fill="#FBF8F3" fillOpacity=".55" stroke="#6B1D2A" strokeWidth="6" />
      <circle cx="226" cy="150" r="34" fill="none" stroke="#E8DCC8" strokeWidth="2" />
      <path d="M212 150 l10 11 l20 -22" fill="none" stroke="#8B1E2D" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M257 182 L296 226" stroke="#4A1220" strokeWidth="12" strokeLinecap="round" />
      <path d="M257 182 L296 226" stroke="#9E2A3A" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Network of connected claims. */
export function ClaimNetwork({ className }: { className?: string }) {
  const nodes: Array<[number, number, number, boolean]> = [
    [160, 100, 20, true], [70, 50, 12, false], [60, 150, 14, false], [260, 55, 13, false], [270, 150, 16, true],
    [160, 190, 12, false], [110, 100, 8, false], [215, 105, 8, false], [30, 100, 7, false], [300, 100, 7, false],
  ];
  const edges: Array<[number, number]> = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [1, 6], [2, 6], [3, 7], [4, 7], [5, 7], [1, 8], [2, 8], [3, 9], [4, 9]];
  return (
    <svg viewBox="0 0 330 220" className={className} role="img" aria-label="Illustration: a network of connected claims and sources">
      {edges.map(([a, b], i) => <line key={i} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} stroke="#6B1D2A" strokeOpacity=".4" strokeWidth="1.2" strokeDasharray={i % 3 === 0 ? '4 3' : undefined} />)}
      {nodes.map(([x, y, r, hot], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r + 5} fill={hot ? '#8B1E2D' : '#E8DCC8'} opacity=".25" />
          <circle cx={x} cy={y} r={r} fill={hot ? '#8B1E2D' : '#F6EFE3'} stroke="#4A1220" strokeWidth="1.5" />
        </g>
      ))}
    </svg>
  );
}

/** Abstract halftone dot pattern. */
export function Halftone({ className, rows = 9, cols = 16 }: { className?: string; rows?: number; cols?: number }) {
  const id = useId();
  const dots: JSX.Element[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const t = (c / (cols - 1)) * 0.85 + (r / (rows - 1)) * 0.15;
      dots.push(<circle key={`${r}-${c}`} cx={10 + c * 20 + (r % 2) * 10} cy={10 + r * 18} r={Math.max(0.6, 7.5 * t)} />);
    }
  }
  return (
    <svg viewBox={`0 0 ${cols * 20 + 10} ${rows * 18 + 4}`} className={className} aria-hidden fill="#8B1E2D" id={id}>
      {dots}
    </svg>
  );
}

/** Pipeline / RAG flow diagram. */
export function RagDiagram({ className }: { className?: string }) {
  const boxes = [
    { x: 8, y: 70, t: 'Article', s: 'text + metadata' },
    { x: 148, y: 70, t: 'Claim extraction', s: 'check-worthy sentences' },
    { x: 288, y: 20, t: 'TF-IDF retrieval', s: 'cosine over KB' },
    { x: 288, y: 120, t: 'Knowledge base', s: 'curated statements' },
    { x: 428, y: 70, t: 'Assessment', s: 'supported / contradicted' },
  ];
  return (
    <svg viewBox="0 0 570 190" className={className} role="img" aria-label="Retrieval-augmented evidence flow: article to claims to retrieval over a knowledge base to assessment">
      <defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#6B1D2A" /></marker></defs>
      {[[128, 95, 148, 95], [268, 90, 288, 48], [268, 100, 288, 140], [368, 78, 368, 120], [408, 48, 428, 88], [408, 148, 428, 108]].map(([a, b, c, d], i) => (
        <line key={i} x1={a} y1={b} x2={c} y2={d} stroke="#6B1D2A" strokeWidth="1.5" markerEnd="url(#arr)" />
      ))}
      {boxes.map((b) => (
        <g key={b.t}>
          <rect x={b.x} y={b.y} width="120" height="50" rx="4" fill={b.t === 'Knowledge base' ? '#E8DCC8' : '#FBF8F3'} stroke="#4A1220" strokeWidth="1.4" />
          <text x={b.x + 60} y={b.y + 22} textAnchor="middle" fontFamily="Playfair Display, serif" fontWeight="700" fontSize="12.5" fill="#4A1220">{b.t}</text>
          <text x={b.x + 60} y={b.y + 38} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="8.5" fill="#2A2326" opacity=".7">{b.s}</text>
        </g>
      ))}
    </svg>
  );
}
