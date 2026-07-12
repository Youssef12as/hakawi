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
      },
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
