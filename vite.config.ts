import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuración para corregir el error de "chunk size" y optimizar la compilación
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1600, // Sube el límite de advertencia
    rollupOptions: {
      output: {
        // Separa las librerías pesadas (como Firebase) en un archivo aparte para mejor rendimiento
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
})
