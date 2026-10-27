/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pink: {
          50: '#fff5f7',
          100: '#ffe9ee',
          200: '#ffd3dd',
          300: '#ffb0c1',
          400: '#ff86a1',
          500: '#f76089',
          600: '#e04570',
          700: '#bc355c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
      },
      boxShadow: {
        soft: '0 2px 12px rgba(0,0,0,0.06)',
        card: '0 4px 20px rgba(247, 96, 137, 0.08)',
      },
    },
  },
  plugins: [],
};
