// Service worker visuelor — cache "offline-first", tout reste sur l'appareil.
const CACHE = 'visuelor-v2'

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(['./', './index.html']).catch(() => {})),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return
  const url = new URL(e.request.url)
  if (url.origin !== location.origin) return // ressources externes (fonts) : réseau direct
  const put = (res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {}) }
    return res
  }
  // Pages HTML : réseau d'abord (pour recevoir les nouvelles versions déployées),
  // cache en secours hors ligne.
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(e.request).then(put).catch(() =>
        caches.match(e.request).then((hit) => hit || caches.match('./index.html')),
      ),
    )
    return
  }
  // Ressources (fichiers versionnés par Vite, icônes…) : cache d'abord.
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then(put)))
})
