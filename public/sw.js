/*
 * Offline support for Clear Council. Caches only this site's own files:
 * pages you have opened keep working without a connection. Map tiles and the
 * City's address lookup are other sites and are never cached here.
 *
 * The build (vite.config.ts) fills in VERSION and PRECACHE. A new build gets a
 * new cache, so old files are dropped and the app's scripts are saved at install,
 * not only after they happen to be fetched through this worker.
 */
const VERSION = 'dev'
const PRECACHE = []
const PREFIX = 'clear-council-'
const CACHE = PREFIX + VERSION
const SHELL = './index.html'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([SHELL, './favicon.svg', './manifest.webmanifest', ...PRECACHE])))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      // Cache Storage is shared by the whole origin (other sites live on this host too): only touch our own caches.
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

/** Only the app's own page may become the offline copy, never an error page or some other file opened in a tab. */
function isAppShell(req, res) {
  const path = new URL(req.url).pathname
  const scope = new URL(self.registration.scope).pathname
  return (
    res.ok &&
    (res.headers.get('content-type') || '').includes('text/html') &&
    (path === scope || path === scope + 'index.html')
  )
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== self.location.origin) return
  if (!url.pathname.startsWith(new URL(self.registration.scope).pathname)) return

  // Pages: try the network first so updates arrive, fall back to the saved copy offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (isAppShell(req, res)) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(SHELL, copy))
          }
          return res
        })
        .catch(() => caches.match(SHELL, { cacheName: CACHE })),
    )
    return
  }

  // Built files have content hashes in their names, so a saved copy never goes stale.
  event.respondWith(
    caches.match(req, { cacheName: CACHE }).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return res
        }),
    ),
  )
})
