import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Root-level Vite config that points to the frontend source inside ./frontend
// Important: production base should be '/', not a repository name. Using a repo-name base caused asset 404s.
const apiBaseUrl = (process.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/+$|\/+$/, '')
const proxyTarget = apiBaseUrl.replace(/\/api$/, '')

const isProd = process.env.NODE_ENV === 'production' || process.env.VITE_ENV === 'production'

export default defineConfig({
  // base must be / in production so assets are referenced from the site root (no /frontend/ prefix)
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      // Keep aliases but point them at the actual frontend/src folder
      '@': path.resolve(__dirname, './frontend/src'),
      '@components': path.resolve(__dirname, './frontend/src/components'),
      '@hooks': path.resolve(__dirname, './frontend/src/hooks'),
      '@utils': path.resolve(__dirname, './frontend/src/utils'),
      '@services': path.resolve(__dirname, './frontend/src/services'),
      '@types': path.resolve(__dirname, './frontend/src/types'),
      '@context': path.resolve(__dirname, './frontend/src/context'),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
  // Ensure public dir points to frontend/public if it exists
  publicDir: path.resolve(__dirname, './frontend/public'),
  // Keep default build.outDir: 'dist' — Vercel expects dist at repo root
})