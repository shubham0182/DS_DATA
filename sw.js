const CACHE = 'tsdata-v1';
const STATIC_RESOURCES = [
  '.',
  'index.html',
  'logo.svg',
  'manifest.json',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Orbitron:wght@400;500;600;700;800;900&family=Bebas+Neue&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/chartjs-chart-financial@2.1.0/dist/chartjs-chart-financial.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/mathjs/12.4.2/math.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
];

const CACHEABLE_ORIGINS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com',
  'cdn.jsdelivr.net',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      return Promise.allSettled(
        STATIC_RESOURCES.map((url) => {
          if (url.startsWith('http')) {
            return fetch(url).then((r) => {
              if (r.ok) cache.put(url, r.clone());
            }).catch(() => {});
          }
          return cache.add(url).catch(() => {});
        })
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).catch(() => {
        if (request.mode === 'navigate') {
          return caches.match('index.html');
        }
      }))
    );
    return;
  }

  if (CACHEABLE_ORIGINS.some((o) => url.hostname === o || url.hostname.endsWith('.' + o))) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  event.respondWith(
    fetch(request).catch(() => {
      if (request.mode === 'navigate') {
        return caches.match('index.html');
      }
    })
  );
});

const PROMO_MSGS = [
  { title:'TS Data Pro Tip', body:'Use the formatting toolbar to style tables like Excel — colors, borders, and more!' },
  { title:'Did You Know?', body:'TS Data supports CSV, Excel, and JSON files. Drag & drop any dataset to analyze.' },
  { title:'TS Data', body:'Create beautiful charts with Chart.js integration — bar, line, pie, scatter, and financial charts.' },
  { title:'Stay Productive', body:'TS Data works offline. Your cached data is always available in the app.' },
  { title:'TS Data', body:'Clean your data in one click — remove duplicates, fill nulls, and detect column types.' },
];
let promoInterval = null;

self.addEventListener('message', (event) => {
  if (event.data === 'start-promo') {
    if (promoInterval) return;
    promoInterval = setInterval(() => {
      const msg = PROMO_MSGS[Math.floor(Math.random() * PROMO_MSGS.length)];
      self.registration.showNotification(msg.title, {
        body: msg.body,
        icon: 'logo.svg',
        badge: 'logo.svg',
        tag: 'tsdata-promo',
        data: { url: '.' }
      });
    }, 3600000);
  }
  if (event.data === 'stop-promo' && promoInterval) {
    clearInterval(promoInterval);
    promoInterval = null;
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const c of windowClients) {
        if (c.url.includes(self.location.origin) && 'focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(event.notification.data?.url || '.');
    })
  );
});
