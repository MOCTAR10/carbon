import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    // Shared class maps (e.g. the SCOPES palette in lib/utils.ts) must be scanned too
    './src/lib/**/*.{js,ts,jsx,tsx}',
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
          300: '#7DBB97',
          400: '#4E9A72',
          500: '#2F7A55',
          600: '#226345',
          700: '#1C5136',
          800: '#174430',
          900: '#123A28',
          950: '#0B2519',
        },
        // Scope palette: distinct hue AND lightness so the three scopes never blur together
        scope1: { DEFAULT: '#1E7A4E', ink: '#17603D', light: '#5CCB93' },
        scope2: { DEFAULT: '#D98E1F', ink: '#9A5F0B', light: '#F2B24D' },
        scope3: { DEFAULT: '#2878A8', ink: '#1F5F86', light: '#72BDE6' },
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
          300: '#E2BE7E',
          400: '#D4A85A',
          500: '#C99A4A',
          600: '#7F6237', // AA (5.3:1) for small text on ivory
          700: '#654C2B',
        },
        ink: {
          400: '#6E736C', // AA (4.6:1) for meta text on ivory
          500: '#5E635C',
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
        'gold':   '0 0 0 1px rgba(201,154,74,0.38), 0 8px 24px -8px rgba(201,154,74,0.38)',
      },
      backgroundImage: {
        'forest-grain': 'radial-gradient(120% 80% at 0% 0%, rgba(201,154,74,0.14) 0%, transparent 55%), radial-gradient(100% 70% at 100% 100%, rgba(78,154,114,0.26) 0%, transparent 60%)',
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
