import { useEffect, useRef, useState } from 'react';
import { animate, useInView, useReducedMotion } from 'framer-motion';

interface Props { value: number; decimals?: number; suffix?: string; prefix?: string; duration?: number; className?: string }

export function CountUp({ value, decimals = 0, suffix = '', prefix = '', duration = 1.2, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduce = useReducedMotion();
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (reduce) { setV(value); return; }
    const c = animate(0, value, { duration, ease: 'easeOut', onUpdate: setV });
    return () => c.stop();
  }, [inView, value, duration, reduce]);
  return <span ref={ref} className={className}>{prefix}{(inView ? v : 0).toFixed(decimals)}{suffix}</span>;
}
