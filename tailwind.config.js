/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#060d18', 800: '#0a1628', 700: '#0f2038', 600: '#16304f' },
        radar: { DEFAULT: '#00d2ff', dim: 'rgba(0,210,255,0.35)', glow: 'rgba(0,210,255,0.15)' },
        amber: { tac: '#ffb703' },
      },
      fontFamily: {
        display: ['Rajdhani', 'Orbitron', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 18px rgba(0,210,255,0.35)',
        amber: '0 0 18px rgba(255,183,3,0.45)',
      },
      keyframes: {
        pulsering: {
          '0%': { transform: 'scale(0.9)', opacity: '0.9' },
          '100%': { transform: 'scale(1.9)', opacity: '0' },
        },
        slidein: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
      animation: {
        pulsering: 'pulsering 1.6s ease-out infinite',
        slidein: 'slidein 0.28s ease-out',
        scan: 'scan 3s linear infinite',
      },
    },
  },
  plugins: [],
};
