import { Suspense } from 'react';
import { Link, useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { Splash } from './Splash';
import { ErrorBoundary } from './ErrorBoundary';
import { useHealth } from '../../hooks/useHealth';

function OfflineBanner() {
  const { offline, reload } = useHealth();
  if (!offline) return null;
  return (
    <div role="alert" className="border-b border-crimson bg-wine text-cream">
      <div className="container-x flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
        <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
        <span>Backend unreachable — start the API server (see <Link to="/docs" className="underline">Docs</Link>).</span>
        <button onClick={reload} className="ml-auto rounded border border-cream/40 px-2 py-0.5 text-xs hover:bg-cream/10">Retry</button>
      </div>
    </div>
  );
}

export function Layout() {
  const loc = useLocation();
  const outlet = useOutlet();
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[100] focus:rounded focus:bg-wine focus:px-3 focus:py-2 focus:text-cream">Skip to content</a>
      <Navbar />
      <OfflineBanner />
      <main id="main" className="flex-1">
        <ErrorBoundary key={loc.pathname}>
          <Suspense fallback={<Splash />}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={loc.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
                {outlet}
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}
