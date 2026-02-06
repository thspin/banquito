/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'bg-white/10',
    'bg-white/20',
    'bg-white/30',
    'bg-white/50',
    'bg-white/70',
    'backdrop-blur-sm',
    'backdrop-blur-lg',
    'border-white/10',
    'border-white/20',
    'border-white/30',
    'from-slate-900',
    'via-slate-800',
    'to-slate-900',
    'bg-gradient-to-br',
    'min-h-screen',
    'text-white',
    'rounded-2xl',
    'rounded-xl',
    'shadow-xl',
    'px-4',
    'py-2',
    'py-3',
    'font-medium',
    'transition-all',
    'duration-200',
    'hover:bg-white/30',
    'focus:outline-none',
    'focus:border-primary-400',
    'placeholder-white/50',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        glass: {
          white: 'rgba(255, 255, 255, 0.1)',
          black: 'rgba(0, 0, 0, 0.2)',
        }
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
