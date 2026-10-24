/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        champagne: {
          50: '#FCF9F2',
          100: '#F7F0DF',
          200: '#EFE0BF',
          300: '#E4CD9A',
          400: '#D5B773',
          500: '#C5A152',
          600: '#A9833B',
          700: '#87652B',
          800: '#674B20',
          900: '#473215',
        },
        rose: {
          50: '#FFF5F6',
          100: '#FDECEE',
          200: '#FBD7DC',
          300: '#F5B0BB',
          400: '#EC8193',
          500: '#DC546C',
          600: '#C13650',
          700: '#9C253B',
          800: '#7B1D2E',
          900: '#5A1420',
        },
        warm: {
          50: '#FAF8F5',
          100: '#F4ECE1',
          200: '#E7D8C4',
          300: '#D6C0A5',
          400: '#B69A7C',
          500: '#957759',
          600: '#765C42',
          700: '#594430',
          800: '#3D2D1F',
          900: '#23180F',
        },
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['Outfit', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        polaroid: '0 12px 35px -5px rgba(61, 45, 31, 0.12), 0 4px 12px -2px rgba(61, 45, 31, 0.08)',
        champagne: '0 8px 30px -4px rgba(197, 161, 82, 0.25)',
        soft: '0 4px 20px -2px rgba(90, 68, 48, 0.06), 0 2px 6px -1px rgba(90, 68, 48, 0.04)',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-up': 'fadeUp 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-down': 'fadeDown 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'float-gentle': 'floatGentle 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translate3d(0, 14px, 0)' },
          '100%': { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
        fadeDown: {
          '0%': { opacity: '0', transform: 'translate3d(0, -10px, 0)' },
          '100%': { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
        floatGentle: {
          '0%, 100%': { transform: 'translate3d(0, 0px, 0)' },
          '50%': { transform: 'translate3d(0, -5px, 0)' },
        },
      },
    },
  },
  plugins: [],
};
