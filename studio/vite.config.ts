import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 54323,
    proxy: {
      '/health': 'http://127.0.0.1:54321',
      '/auth': 'http://127.0.0.1:54321',
      '/rest': 'http://127.0.0.1:54321',
      '/storage': 'http://127.0.0.1:54321',
      '/studio-api': 'http://127.0.0.1:54321',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
