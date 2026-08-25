/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary — electric violet (AI-Native)
        primary: {
          50:  '#f3f0ff',
          100: '#e9e3ff',
          200: '#d5cbff',
          300: '#b9a6ff',
          400: '#9775ff',
          500: '#7c4dff',
          600: '#6c35f5',
          700: '#5b23e1',
          800: '#4b1dbc',
          900: '#3e1a99',
          950: '#250d6b',
        },
        // Accent — neon cyan
        accent: {
          50:  '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },
        // Success green
        success: {
          50:  '#f0fdf4',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          900: '#14532d',
        },
        // Warning amber
        warning: {
          50:  '#fffbeb',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          900: '#78350f',
        },
        // Error red
        error: {
          50:  '#fff1f2',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          900: '#7f1d1d',
        },
        // Dark surfaces (AI-Native dark UI)
        surface: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          900: '#0d0d14',
          800: '#12121e',
          750: '#161624',
          700: '#1c1c2e',
          650: '#21213a',
          600: '#272748',
          500: '#2e2e56',
        },
        youtube: {
          red:  '#FF0000',
          dark: '#0f0f0f',
        },
      },

      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        mono:  ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },

      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },

      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },

      boxShadow: {
        'glow-sm':  '0 0 12px 0 rgb(124 77 255 / 0.25)',
        'glow':     '0 0 24px 0 rgb(124 77 255 / 0.35)',
        'glow-lg':  '0 0 40px 0 rgb(124 77 255 / 0.45)',
        'glow-cyan':'0 0 24px 0 rgb(6 182 212 / 0.35)',
        'glass':    '0 8px 32px 0 rgb(0 0 0 / 0.36)',
        'card':     '0 4px 24px 0 rgb(0 0 0 / 0.25)',
        'inner-glow':'inset 0 1px 0 0 rgb(255 255 255 / 0.06)',
      },

      backgroundImage: {
        // Mesh gradients
        'mesh-purple': 'radial-gradient(at 40% 20%, hsla(263,80%,50%,0.18) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(189,100%,56%,0.12) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(355,100%,50%,0.08) 0px, transparent 50%)',
        'mesh-dark':   'radial-gradient(at 20% 80%, hsla(263,80%,40%,0.15) 0px, transparent 50%), radial-gradient(at 80% 20%, hsla(189,100%,40%,0.10) 0px, transparent 50%)',
        // Gradients
        'gradient-primary': 'linear-gradient(135deg, #7c4dff 0%, #22d3ee 100%)',
        'gradient-dark':    'linear-gradient(180deg, #12121e 0%, #0d0d14 100%)',
        'gradient-card':    'linear-gradient(135deg, rgba(124,77,255,0.08) 0%, rgba(6,182,212,0.04) 100%)',
        // Glass
        'glass-light': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
        'glass-dark':  'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
      },

      backdropBlur: {
        xs: '2px',
      },

      animation: {
        'fade-in':       'fadeIn 0.3s ease-out',
        'fade-up':       'fadeUp 0.4s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-in-right':'slideInRight 0.3s ease-out',
        'slide-down':    'slideDown 0.3s ease-out',
        'scale-in':      'scaleIn 0.2s ease-out',
        'pulse-slow':    'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'glow-pulse':    'glowPulse 2s ease-in-out infinite',
        'float':         'float 3s ease-in-out infinite',
        'shimmer':       'shimmer 2s linear infinite',
        'spin-slow':     'spin 3s linear infinite',
        'bounce-soft':   'bounceSoft 1s ease-in-out infinite',
      },

      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%':   { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%':   { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideDown: {
          '0%':   { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 12px 0 rgb(124 77 255 / 0.3)' },
          '50%':      { boxShadow: '0 0 32px 0 rgb(124 77 255 / 0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-4px)' },
        },
      },

      spacing: {
        '18': '4.5rem',
        '68': '17rem',
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
      },

      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },

      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
    },
  },
  plugins: [],
}
