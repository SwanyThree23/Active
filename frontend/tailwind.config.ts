import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: '#0a0a0f',
          darker: '#050508',
          purple: '#b829dd',
          pink: '#ff2a6d',
          blue: '#05d9e8',
          cyan: '#01ffc3',
          yellow: '#f9f002',
        },
      },
      fontFamily: {
        cyber: ['Orbitron', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'glitch': 'glitch 1s linear infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #b829dd, 0 0 10px #b829dd, 0 0 15px #b829dd' },
          '100%': { boxShadow: '0 0 10px #05d9e8, 0 0 20px #05d9e8, 0 0 30px #05d9e8' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glitch: {
          '0%, 100%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
        },
      },
      backgroundImage: {
        'cyber-grid': `linear-gradient(rgba(5, 217, 232, 0.03) 1px, transparent 1px),
                       linear-gradient(90deg, rgba(5, 217, 232, 0.03) 1px, transparent 1px)`,
      },
    },
  },
  plugins: [],
}

export default config
