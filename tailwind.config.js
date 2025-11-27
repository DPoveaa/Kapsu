/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Verde farmacêutico - cor principal (saúde, bem-estar, natureza)
        primary: {
          50: '#f0fdf5',
          100: '#dcfce8',
          200: '#bbf7d1',
          300: '#86efac',
          400: '#4ade80',
          500: '#28a745', // Verde farmácia profissional
          600: '#228b3a', // Verde principal
          700: '#1e7e34',
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
          600: '#2563eb', // Azul confiança
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Verde complementar mais suave
        accent: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
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

