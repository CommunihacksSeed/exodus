import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * Content-Security-Policy for the built site only (the dev server needs inline scripts).
 * The site talks to exactly two outside hosts: OpenFreeMap (map tiles, styles, fonts)
 * and the City's geocoder. Nothing else can be loaded or contacted.
 */
const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'", // MapLibre and React set inline style attributes
  "img-src 'self' data: blob: https://tiles.openfreemap.org",
  "font-src 'self' data: https://tiles.openfreemap.org",
  "connect-src 'self' https://tiles.openfreemap.org https://map.toronto.ca",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

function securityMeta(): Plugin {
  return {
    name: 'clear-council-security-meta',
    apply: 'build',
    transformIndexHtml() {
      return [
        { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
        { tag: 'meta', attrs: { name: 'referrer', content: 'no-referrer' }, injectTo: 'head-prepend' },
      ]
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the built site works from any sub-path (e.g. GitHub Pages).
  base: './',
  plugins: [react(), securityMeta()],
  // The map's worker is an ES module that shares code with the main bundle.
  worker: { format: 'es' },
})
