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
        // Nova paleta de cores
        palette: {
          light: '#DDF4E7',   // Verde muito claro
          medium: '#67C090',   // Verde médio
          dark: '#26667F',     // Azul escuro
          darker: '#124170',   // Azul muito escuro
        },
        // Verde farmacêutico - cor principal (saúde, bem-estar, natureza)
        primary: {
          50: '#DDF4E7',  // Nova cor light
          100: '#dcfce8',
          200: '#bbf7d1',
          300: '#86efac',
          400: '#67C090',  // Nova cor medium
          500: '#28a745',
          600: '#26667F',  // Nova cor dark
          700: '#124170',  // Nova cor darker
          800: '#1a6b2d',
          900: '#155724',
        },
        // Azul confiança - cor secundária (profissionalismo, segurança)
        medical: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#26667F',  // Nova cor dark
          700: '#124170',  // Nova cor darker
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Verde complementar mais suave
        accent: {
          50: '#DDF4E7',  // Nova cor light
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#67C090',  // Nova cor medium
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        }
      }
    },
  },
  plugins: [],
}

