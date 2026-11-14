/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F8FAF6',
        surface: '#FFFFFF',
        sage: {
          50: '#F3FCEF',
          100: '#EDF6E9',
          200: '#E8F0E4',
          300: '#DCE5D9',
          400: '#C3D2C0',
        },
        forest: {
          50: '#E8F4EC',
          100: '#D3EBDD',
          200: '#A4D9B6',
          300: '#7BC694',
          400: '#3E9260',
          500: '#176B3A',
          600: '#11522C',
          700: '#0C3F21',
          800: '#082E18',
          900: '#0F2417',
        },
        sprout: {
          50: '#F0F8EB',
          100: '#E0F1D6',
          200: '#C6E7C9',
          300: '#95D878',
          400: '#69A84F',
          500: '#4E8B37',
          600: '#3B6D2A',
        },
        harvest: {
          50: '#FEF6E7',
          100: '#FDEBC7',
          200: '#F8D890',
          300: '#F4B942',
          400: '#D99A00',
          500: '#B47B00',
          600: '#9A6700',
        },
        ink: '#0F2417',
        'ink-soft': '#202820',
        muted: '#52634F',
        line: '#E5EAE3',
        critical: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FCA5A5',
          600: '#991B1B',
        },
        transit: {
          50: '#EDF7EE',
          100: '#D8EEDB',
          200: '#C6E7C9',
          700: '#14532D',
        },
        delivered: {
          50: '#E0F2FE',
          100: '#BAE6FD',
          700: '#0C4A6E',
        },
      },
      fontFamily: {
        display: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        display: ['3rem', { lineHeight: '3.5rem', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-sm': ['2.25rem', { lineHeight: '2.75rem', letterSpacing: '-0.015em', fontWeight: '700' }],
        headline: ['1.75rem', { lineHeight: '2.25rem', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-sm': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        'label-sm': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.02em', fontWeight: '600' }],
        'label-md': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '500' }],
        currency: ['2rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em', fontWeight: '800' }],
      },
      borderRadius: {
        btn: '8px',
        card: '16px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(32, 40, 32, 0.04), 0 1px 2px rgba(32, 40, 32, 0.02)',
        lift: '0 4px 8px -2px rgba(32, 40, 32, 0.06), 0 2px 4px -2px rgba(32, 40, 32, 0.04)',
        modal: '0 16px 32px -8px rgba(32, 40, 32, 0.12), 0 4px 12px rgba(32, 40, 32, 0.04)',
      },
      maxWidth: {
        shell: '1280px',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up .45s cubic-bezier(.22,1,.36,1) both',
        'scale-in': 'scale-in .2s ease-out both',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
