import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Served under `/studio/` when mounted on a Vaab route (see rig.resolve_studio).
  base: '/studio/',
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
  server: {
    port: 54323,
    proxy: {
      '/health': 'http://127.0.0.1:54321',
      '/auth': 'http://127.0.0.1:54321',
      '/rest': 'http://127.0.0.1:54321',
      '/storage': 'http://127.0.0.1:54321',
      '/realtime': { target: 'http://127.0.0.1:54321', ws: true },
      '/functions': 'http://127.0.0.1:54321',
      '/studio-api': 'http://127.0.0.1:54321',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
