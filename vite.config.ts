import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: parseInt(process.env.VITE_PORT || process.env.PORT || '3000', 10),
    host: true, // Permite acesso de outros dispositivos na rede
    watch: {
      usePolling: true, // Necessário no Windows para detectar mudanças de ferramentas externas
    },
  },
  build: {
    rollupOptions: {
      // Limita o número de arquivos abertos em paralelo para evitar erro ENFILE em servidores menores
      maxParallelFileOps: 2,
    },
  },
})

