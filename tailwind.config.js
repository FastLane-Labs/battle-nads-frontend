/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4F46E5',
        secondary: '#6B7280',
        background: '#111827',
        surface: '#1F2937',
        accent: '#10B981',
        danger: '#EF4444',
      },
    },
  },
  plugins: [],
}; 