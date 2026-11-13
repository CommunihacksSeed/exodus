import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the built site works from any sub-path (e.g. GitHub Pages).
  base: './',
  plugins: [react()],
  // The map's worker is an ES module that shares code with the main bundle.
  worker: { format: 'es' },
})
