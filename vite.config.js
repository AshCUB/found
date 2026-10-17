import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'

// GitHub Pages serves 404.html for unknown paths, so direct loads of client routes (e.g. /sign-in) still boot the app.
const spaFallback = () => ({
  name: 'spa-fallback-404',
  apply: 'build',
  closeBundle() {
    copyFileSync(resolve('dist/index.html'), resolve('dist/404.html'))
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), spaFallback()],
  base: '/found/',
})
