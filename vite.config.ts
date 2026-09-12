import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

const buildVersion = Date.now().toString()

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'import.meta.env.VITE_BUILD_VERSION': JSON.stringify(buildVersion)
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: [
        'src/lib/**',
        'src/services/**',
        'src/hooks/**',
        'src/stores/**'
      ],
      exclude: ['src/test/**', 'src/**/*.test.*', 'src/**/*.spec.*']
    }
  }
})
