import { Link } from 'react-router-dom';

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" aria-label="Veritrace home" className="inline-flex items-center gap-2.5">
      <img src="/logo-mark.svg" alt="" width={36} height={36} className="h-9 w-9" />
      <span className={`font-serif text-2xl font-bold tracking-tight ${light ? 'text-cream' : 'text-wine'}`}>Veritrace</span>
    </Link>
  );
}
