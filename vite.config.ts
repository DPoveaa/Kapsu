import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: parseInt(process.env.VITE_PORT || process.env.PORT || '3000', 10),
    host: true, // Permite acesso de outros dispositivos na rede
  },
})

