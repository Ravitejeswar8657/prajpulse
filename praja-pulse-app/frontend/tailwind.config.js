/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        anton: ['Anton', 'sans-serif'],
        archivo: ['Archivo', 'sans-serif'],
        telugu: ['Noto Sans Telugu', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
