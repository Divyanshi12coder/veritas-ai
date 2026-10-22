import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Logo } from './Logo';
import { LinkButton } from '../ui/Button';
import { dateline } from '../../lib/format';

export const NAV = [
  { to: '/analyze', label: 'Analyze' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/models', label: 'Models' },
  { to: '/methodology', label: 'Methodology' },
  { to: '/about', label: 'About' },
  { to: '/docs', label: 'Docs' },
];

const linkCls = ({ isActive }: { isActive: boolean }) =>
  `relative px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'text-crimson after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:bg-crimson' : 'text-charcoal/80 hover:text-crimson'}`;

export function Navbar() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-beige bg-paper/92 backdrop-blur supports-[backdrop-filter]:bg-paper/80">
      <div className="hidden border-b border-beige bg-cream sm:block">
        <div className="container-x flex items-center justify-between py-1 font-mono text-[10px] tracking-[0.18em] text-charcoal/60">
          <span>{dateline()}</span>
          <span>THE ANALYSIS DESK · MISINFORMATION INTELLIGENCE</span>
        </div>
      </div>
      <div className="container-x flex h-16 items-center justify-between">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {NAV.map((n) => <NavLink key={n.to} to={n.to} className={linkCls}>{n.label}</NavLink>)}
        </nav>
        <div className="hidden lg:block"><LinkButton to="/analyze" size="sm">Analyze an article</LinkButton></div>
        <button
          className="rounded p-2 text-wine hover:bg-beige lg:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-nav"
            aria-label="Mobile"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-beige bg-paper lg:hidden"
          >
            <div className="container-x flex flex-col py-3">
              {NAV.map((n) => (
                <NavLink key={n.to} to={n.to} className={({ isActive }) => `border-b border-beige/70 py-3 font-serif text-xl ${isActive ? 'text-crimson' : 'text-wine'}`}>{n.label}</NavLink>
              ))}
              <LinkButton to="/analyze" className="mt-4">Analyze an article</LinkButton>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
