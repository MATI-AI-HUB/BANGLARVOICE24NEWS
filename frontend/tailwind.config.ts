import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#C41E1E', foreground: '#FFFFFF' },
        ink: '#0F0F0F',
        paper: '#FFFEFB',
        muted: '#F5F2ED',
        border: '#E5E2DE',
      },
      fontFamily: {
        serifbn: ['"Noto Serif Bengali"', 'serif'],
        sansbn: ['"Hind Siliguri"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
