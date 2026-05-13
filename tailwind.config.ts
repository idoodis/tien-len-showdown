import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        arena: {
          0: '#04030a',
          1: '#0a0814',
          2: '#13102a',
          3: '#1e1740',
        },
        ko: {
          red:    '#ff3a52',
          gold:   '#ffd84a',
          blue:   '#4ad9ff',
          purple: '#a25bff',
          pink:   '#ff5ad9',
          green:  '#42f5b6',
        },
      },
      fontFamily: {
        display: ['"Bebas Neue"', '"Anton"', 'Impact', 'sans-serif'],
        sans:    ['"Inter"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        neon:        '0 0 0 1px rgba(74,217,255,0.35), 0 0 32px -4px rgba(74,217,255,0.45)',
        neonPink:    '0 0 0 1px rgba(255,90,217,0.35), 0 0 32px -4px rgba(255,90,217,0.45)',
        neonGold:    '0 0 0 1px rgba(255,216,74,0.4), 0 0 28px -4px rgba(255,216,74,0.5)',
        card:        '0 16px 40px -8px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)',
        arenaInner:  'inset 0 0 200px rgba(0,0,0,0.85), inset 0 0 0 1px rgba(255,255,255,0.04)',
      },
      keyframes: {
        slamIn: {
          '0%':   { transform: 'translateX(-30%) skewX(-12deg) scale(0.6)', opacity: '0' },
          '55%':  { transform: 'translateX(2%)   skewX(-12deg) scale(1.08)', opacity: '1' },
          '70%':  { transform: 'translateX(-1%)  skewX(-12deg) scale(0.98)' },
          '100%': { transform: 'translateX(0)    skewX(-12deg) scale(1)',    opacity: '1' },
        },
        speedLines: {
          '0%':   { backgroundPositionX: '0%' },
          '100%': { backgroundPositionX: '200%' },
        },
        flashPulse: {
          '0%,100%': { opacity: '0' },
          '50%':     { opacity: '0.45' },
        },
        shake: {
          '0%,100%': { transform: 'translate(0,0)' },
          '10%':     { transform: 'translate(-3px, 2px)' },
          '30%':     { transform: 'translate(4px, -3px)' },
          '50%':     { transform: 'translate(-5px, 1px)' },
          '70%':     { transform: 'translate(3px, 3px)' },
          '90%':     { transform: 'translate(-2px, -2px)' },
        },
        sweep: {
          '0%':   { transform: 'translateX(-110%) skewX(-20deg)', opacity: '0' },
          '30%':  { opacity: '1' },
          '100%': { transform: 'translateX(110%)  skewX(-20deg)', opacity: '0' },
        },
        haloPulse: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(74,217,255,0.0)' },
          '50%':     { boxShadow: '0 0 0 8px rgba(74,217,255,0.18)' },
        },
        floatIn: {
          '0%':   { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
      },
      animation: {
        slamIn:    'slamIn 480ms cubic-bezier(.2,.9,.1,1) both',
        speedLines:'speedLines 1.6s linear infinite',
        flashPulse:'flashPulse 280ms ease-out',
        shake:     'shake 360ms cubic-bezier(.36,.07,.19,.97)',
        sweep:     'sweep 700ms ease-out both',
        haloPulse: 'haloPulse 1.4s ease-in-out infinite',
        floatIn:   'floatIn 320ms ease-out both',
      },
    },
  },
  plugins: [],
};
export default config;
