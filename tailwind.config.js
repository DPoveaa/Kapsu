/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Habilita dark mode usando classe
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Bellota Text"', 'sans-serif'],
      },
      colors: {
        palette: {
          light: '#FFFFFF',   
          medium: '#00A86B',   
          dark: '#007A4E',     
          darker: '#1E3A8A',   
        },
        primary: {
          50: '#E8FFF4',
          100: '#CFFFE7',
          200: '#A3F7CE',
          300: '#6BE7A8',
          400: '#33D782',
          500: '#00A86B',
          600: '#008A57',
          700: '#007A4E',
          800: '#005E3B',
          900: '#003D27',
        },
        medical: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E3A8A',
          900: '#172554',
        },
        neutral: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111111',
        },
        accent: {
          50: '#E8FFF4',
          100: '#CFFFE7',
          200: '#A3F7CE',
          300: '#6BE7A8',
          400: '#33D782',
          500: '#00A86B',
          600: '#008A57',
          700: '#007A4E',
          800: '#005E3B',
          900: '#003D27',
        },
        promo: {
          50:  '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
      }
    },
  },
  plugins: [],
}

