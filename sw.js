// Bump VERSION on every deploy so installed copies pick up the update.
const VERSION = 'v2';
const CACHE = 'foul-tracker-' + VERSION;
const ASSETS = ['./', 'index.html', 'manifest.json', 'echarts.min.js', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Stale-while-revalidate for same-origin GETs; works fully offline.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(req, { ignoreSearch: true }).then(hit => {
        const net = fetch(req).then(res => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        }).catch(() => hit || (req.mode === 'navigate' ? cache.match('index.html') : undefined));
        return hit || net;
      })
    )
  );
});

// Best-effort background reminder (Android Chrome decides the exact timing).
self.addEventListener('periodicsync', e => {
  if (e.tag === 'daily-checkin') {
    e.waitUntil(self.registration.showNotification('Daily check-in', {
      body: 'A quiet moment to log today and review your streak.',
      icon: 'icon-192.png', badge: 'icon-192.png', tag: 'daily'
    }));
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) return c.focus();
    return clients.openWindow('./');
  }));
});
