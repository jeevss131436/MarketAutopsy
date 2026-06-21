import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        neon: '#00ff88',
        'neon-dim': '#00cc6a',
        'neon-dark': '#00884a',
        cyber: {
          black: '#050505',
          dark: '#0a0a0a',
          card: '#111111',
          border: '#1c1c1c',
        },
      },
      boxShadow: {
        neon: '0 0 20px rgba(0,255,136,0.35), 0 0 60px rgba(0,255,136,0.12)',
        'neon-sm': '0 0 10px rgba(0,255,136,0.25)',
        'neon-lg': '0 0 40px rgba(0,255,136,0.45), 0 0 80px rgba(0,255,136,0.18)',
      },
      animation: {
        'neon-pulse': 'neonPulse 2.5s ease-in-out infinite',
        'scan-line': 'scanLine 3s linear infinite',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        neonPulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        scanLine: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
