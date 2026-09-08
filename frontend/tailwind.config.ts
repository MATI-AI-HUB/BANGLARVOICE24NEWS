import type { Config } from 'tailwindcss';

/**
 * Banglar Voice — Luxury Editorial palette.
 * Brand crimson (#CC0000 / #C41E1E) kept for the breaking brand moments;
 * #DC2626 is the deep-crimson action accent, #0F172A OLED dark navy for
 * immersive sections, #FAFAFD paper cream background.
 */
const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand / action
        primary: { DEFAULT: '#C41E1E', foreground: '#FFFFFF' },
        brand: { DEFAULT: '#CC0000', dark: '#A30000' },
        crimson: { DEFAULT: '#DC2626', light: '#F87171', dark: '#991B1B' },
        // Surfaces
        ink: '#0F0F0F',
        navy: '#0F172A',
        paper: '#FAFAFD',
        cream: '#FAFAFD',
        muted: '#F5F2ED',
        border: '#E5E2DE',
      },
      fontFamily: {
        serifbn: ['var(--font-serif-bn)', 'Noto Serif Bengali', 'serif'],
        sansbn: ['var(--font-sans-bn)', 'Hind Siliguri', 'system-ui', 'sans-serif'],
      },
      animation: {
        marquee: 'marquee 30s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(15, 23, 42, 0.08)',
        card: '0 1px 3px rgba(15, 23, 42, 0.06), 0 8px 24px -12px rgba(15, 23, 42, 0.12)',
      },
    },
  },
  plugins: [],
};

export default config;
