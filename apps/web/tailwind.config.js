/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#07080a',
          900: '#0d0e12',
          850: '#12141a',
          800: '#171922',
          750: '#1e212c',
          700: '#252936',
          600: '#323748',
          500: '#464c62',
        },
        brand: {
          blue: '#2d6cf6',
          blueHover: '#1d57db',
          blueLight: '#4d83ff',
          live: '#ff2e56',
        },
        discord: {
          bg: '#0d0e12',
          sidebar: '#12141a',
          servers: '#07080a',
          hover: '#1e212c',
          active: '#252936',
          text: '#e2e5eb',
          muted: '#8c93a4',
          brand: '#2d6cf6',
          brandHover: '#1d57db',
          green: '#10b981',
          red: '#ff2e56',
          yellow: '#f59e0b',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      minHeight: {
        dvh: '100dvh',
      },
      height: {
        dvh: '100dvh',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.65', transform: 'scale(1.08)' },
        },
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
