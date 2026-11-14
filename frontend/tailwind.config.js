/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EEFBF3',
          100: '#D5F5E2',
          200: '#ADE9C8',
          300: '#77D8A6',
          400: '#40C07F',
          500: '#16A363',
          600: '#0B8050',
          700: '#096841',
          800: '#0A5436',
          900: '#0A452E',
          950: '#04281A'
        },
        lime: {
          50: '#F7FEE7',
          100: '#ECFCCB',
          200: '#DBF99C',
          300: '#C6F24E',
          400: '#B4E626',
          500: '#98C70E',
          600: '#77A006',
          700: '#5A7A0A',
          800: '#48600F',
          900: '#3D5112'
        },
        amber: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F'
        },
        sand: {
          50: '#FAFAF7',
          100: '#F3F3ED',
          200: '#E8E8DF',
          300: '#D8D8CC',
          400: '#B4B4A6',
          500: '#8C8C7E',
          600: '#6B6B60',
          700: '#54544B',
          800: '#3C3C35',
          900: '#262620'
        },
        ink: {
          DEFAULT: '#07160F',
          soft: '#0E2418',
          muted: '#4A5A52',
          950: '#02100A'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace']
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }]
      },
      borderRadius: {
        sm: '8px',
        DEFAULT: '10px',
        md: '10px',
        lg: '14px',
        xl: '18px',
        '2xl': '24px',
        '3xl': '32px'
      },
      boxShadow: {
        xs: '0 1px 2px rgba(7,22,15,.05)',
        sm: '0 1px 2px rgba(7,22,15,.05), 0 4px 12px -6px rgba(7,22,15,.08)',
        md: '0 8px 24px -10px rgba(7,22,15,.14)',
        lg: '0 24px 56px -24px rgba(7,22,15,.26)',
        xl: '0 40px 90px -40px rgba(7,22,15,.35)',
        ring: '0 0 0 4px rgba(11,128,80,.14)',
        'ring-accent': '0 0 0 4px rgba(180,230,38,.2)'
      },
      spacing: {
        '4.5': '1.125rem',
        18: '4.5rem',
        22: '5.5rem'
      },
      maxWidth: {
        '8xl': '88rem',
        prose2: '68ch'
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' }
        },
        'pulse-soft': {
          '0%,100%': { opacity: '.5', transform: 'scale(1)' },
          '50%': { opacity: '.85', transform: 'scale(1.05)' }
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' }
        }
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 6s linear infinite',
        'pulse-soft': 'pulse-soft 7s ease-in-out infinite',
        'fade-up': 'fade-up .5s cubic-bezier(.22,1,.36,1) both',
        marquee: 'marquee 32s linear infinite'
      },
      transitionTimingFunction: {
        snap: 'cubic-bezier(.22,1,.36,1)'
      }
    }
  },
  plugins: []
}
