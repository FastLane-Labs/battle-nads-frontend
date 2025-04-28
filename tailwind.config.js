/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4F46E5', // indigo-600
        secondary: '#2D3748', // gray-700
        accent: '#E6855E', // custom orange-ish
        danger: '#DC2626', // red-600
        background: '#1F2937', // gray-800
        surface: '#374151', // gray-700, added for game-tile background
      },
    },
  },
  plugins: [],
}; 