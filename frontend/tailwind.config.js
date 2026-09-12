/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        sand: '#E8D1A7',
        olive: '#9D9167',
        brown: '#84592B',
        wine: '#743014',
        espresso: '#442D1C',
        night: {
          DEFAULT: '#0e0b08',
          deep: '#080604',
          surface: '#17120c',
          elevated: '#221b12',
        },
        gold: {
          DEFAULT: '#c89830',
          bright: '#e8bc58',
          dim: 'rgba(200, 152, 48, 0.18)',
          glow: 'rgba(200, 152, 48, 0.4)',
        },
        parchment: {
          DEFAULT: '#f0e0c8',
          ivory: '#fff8ee',
          muted: '#a4947d',
        },
      },
      fontFamily: {
        cairo: ['IBM Plex Sans Arabic', 'Cairo', 'sans-serif'],
        kufi: ['Noto Kufi Arabic', 'Cairo', 'sans-serif'],
        amiri: ['Amiri', 'serif'],
      },
    },
  },
  plugins: [],
}
