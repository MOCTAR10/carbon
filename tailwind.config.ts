import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'brand': {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        // ── Forest & Ivory (company portal) ──
        forest: {
          50:  '#EEF4F0',
          100: '#D7E5DC',
          200: '#AFCBB9',
          300: '#7FA98F',
          400: '#538767',
          500: '#356A4C',
          600: '#24533A',
          700: '#1A402C',
          800: '#133223',
          900: '#0F2A1D',
          950: '#091A12',
        },
        ivory: {
          50:  '#FDFCF8',
          100: '#FAF8F2',
          200: '#F4F0E6',
          300: '#EAE4D6',
          400: '#DBD3C0',
        },
        gold: {
          50:  '#FAF5EC',
          100: '#F2E7D3',
          200: '#E5CFA8',
          300: '#D3B27C',
          400: '#C4A068',
          500: '#B8935A',
          600: '#9A7744',
          700: '#7A5D36',
        },
        ink: {
          400: '#8A8F87',
          500: '#6B7069',
          600: '#4E534D',
          700: '#363A35',
          800: '#232622',
          900: '#161815',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans:    ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft':   '0 1px 2px rgba(15,42,29,0.04), 0 4px 16px -4px rgba(15,42,29,0.06)',
        'lifted': '0 2px 4px rgba(15,42,29,0.04), 0 16px 40px -12px rgba(15,42,29,0.14)',
        'gold':   '0 0 0 1px rgba(184,147,90,0.35), 0 8px 24px -8px rgba(184,147,90,0.35)',
      },
      backgroundImage: {
        'forest-grain': 'radial-gradient(120% 80% at 0% 0%, rgba(184,147,90,0.10) 0%, transparent 55%), radial-gradient(100% 70% at 100% 100%, rgba(83,135,103,0.18) 0%, transparent 60%)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both',
        shimmer:   'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [animate],
}
export default config
