export function Splash() {
  return (
    <div role="status" aria-label="Loading" className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <img src="/logo-mark.svg" alt="" width={64} height={64} className="h-16 w-16" />
      <span className="font-serif text-3xl font-bold text-wine">Veritrace</span>
      <div className="relative h-0.5 w-40 overflow-hidden rounded bg-beige">
        <div className="absolute inset-y-0 w-1/3 animate-sweep bg-crimson" />
      </div>
    </div>
  );
}
