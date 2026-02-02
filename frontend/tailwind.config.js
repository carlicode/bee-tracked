/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'beezero': {
          yellow: '#FFD700', // Amarillo principal de BeeZero
          'yellow-dark': '#FFC700',
          black: '#000000',
          'gray-dark': '#1F2937',
          'gray-light': '#F9FAFB',
        },
        'ecodelivery': {
          green: '#10B981', // Verde principal de EcoDelivery
          'green-dark': '#059669',
          'green-light': '#34D399',
          black: '#000000',
          'gray-dark': '#1F2937',
          'gray-light': '#F9FAFB',
        },
      },
    },
  },
  plugins: [],
}

