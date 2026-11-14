import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
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

/**
 * Fills in public/sw.js after the build: the list of built scripts, styles and
 * Latin fonts to save at install, and a version taken from those file names
 * (they carry content hashes), so each deploy gets a fresh cache.
 */
function serviceWorkerManifest(): Plugin {
  let outDir = 'dist'
  return {
    name: 'clear-council-sw-manifest',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    writeBundle(_options, bundle) {
      const files = Object.keys(bundle)
        .filter((f) => /\.(js|css)$/.test(f) || (/\.woff2$/.test(f) && /-latin-(?!ext)/.test(f)))
        .sort()
      const version = createHash('sha256').update(files.join('\n')).digest('hex').slice(0, 12)
      const file = path.join(outDir, 'sw.js')
      const src = readFileSync(file, 'utf8')
      const out = src
        .replace("const VERSION = 'dev'", `const VERSION = '${version}'`)
        .replace('const PRECACHE = []', `const PRECACHE = ${JSON.stringify(files.map((f) => `./${f}`))}`)
      if (out === src) throw new Error('sw.js placeholders not found')
      writeFileSync(file, out)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the built site works from any sub-path (e.g. GitHub Pages).
  base: './',
  plugins: [react(), securityMeta(), serviceWorkerManifest()],
  // The map's worker is an ES module that shares code with the main bundle.
  worker: { format: 'es' },
})
