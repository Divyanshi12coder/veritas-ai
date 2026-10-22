/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        crimson: { DEFAULT: '#8B1E2D', muted: '#9E2A3A' },
        burgundy: '#6B1D2A',
        wine: '#4A1220',
        beige: '#E8DCC8',
        cream: '#F6EFE3',
        paper: '#FBF8F3',
        charcoal: '#2A2326',
        ochre: '#A9782C',
        olive: '#4F5D3A',
      },
      fontFamily: {
        serif: ['"Playfair Display"', '"Source Serif 4"', 'Georgia', 'serif'],
        text: ['"Source Serif 4"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        clip: '0 1px 0 rgba(74,18,32,.06), 0 12px 32px -14px rgba(74,18,32,.35)',
        card: '0 1px 2px rgba(74,18,32,.08), 0 6px 18px -10px rgba(74,18,32,.25)',
      },
      keyframes: {
        sweep: { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(250%)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: { sweep: 'sweep 1.4s ease-in-out infinite', shimmer: 'shimmer 1.6s infinite' },
    },
  },
  plugins: [],
};
