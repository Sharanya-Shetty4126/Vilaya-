/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,html}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          900: '#0B2318',
          800: '#143D2B', // Brand primary
          700: '#1B4D36',
          600: '#266A4B',
          500: '#2D6A4F', // Sage emerald
          100: '#E4EFEA',
          50: '#F0F6F3',
        },
        gold: {
          600: '#9E7E38',
          500: '#C5A059', // Muted gold
          400: '#D4AF37',
          300: '#E2C882',
          200: '#EEDCB0',
          100: '#F8F2E2',
          50: '#FCF9F1',
        },
        amber: {
          500: '#DDA15E', // Grace period warm amber
          100: '#FDF1E3',
        },
        ivory: {
          900: '#1E2922', // Deep ink typography
          800: '#2C3A32',
          700: '#4A5B52',
          600: '#5C6E64', // Soft olive grey
          200: '#EAE5D9',
          100: '#F4F0E8', // Sand white card surface
          50: '#FDFBF7',  // Primary warm ivory backdrop
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'serif'],
      },
      boxShadow: {
        'luxury': '0 4px 20px -2px rgba(20, 61, 43, 0.08), 0 2px 6px -1px rgba(20, 61, 43, 0.04)',
        'luxury-hover': '0 10px 25px -3px rgba(20, 61, 43, 0.12), 0 4px 10px -2px rgba(20, 61, 43, 0.06)',
      },
    },
  },
  plugins: [],
}

