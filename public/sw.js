// Service Worker para Web Push — Sportshot
// Este arquivo DEVE estar na raiz do domínio (public/sw.js)

const CACHE_NAME = 'sportshot-v1';
const OFFLINE_URL = '/';

// ─── Install Event ───────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installed');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([OFFLINE_URL]);
    })
  );
});

// ─── Activate Event ──────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activated');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clean old caches
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      ),
    ])
  );
});

// ─── Fetch Event (Network First, Cache Fallback) ─────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.open(CACHE_NAME).then((cache) => cache.match(OFFLINE_URL))
      )
    );
  }
});

// ─── Push Event ──────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');

  let data = { title: 'Sportshot', body: 'Nova mensagem do clube!', url: '/' };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    image: data.image || undefined,
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'Ver mais' },
      { action: 'close', title: 'Fechar' },
    ],
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ─── Notification Click Event ─────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();

  if (event.action === 'close') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
