import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const apiBaseUrl = (process.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/+$/, '')
const proxyTarget = apiBaseUrl.replace(/\/api$/, '')

const isProd = process.env.NODE_ENV === 'production' || process.env.VITE_ENV === 'production';

export default defineConfig({
  base: isProd ? '/Mess-Management-System/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@services': path.resolve(__dirname, './src/services'),
      '@types': path.resolve(__dirname, './src/types'),
      '@context': path.resolve(__dirname, './src/context'),
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
})