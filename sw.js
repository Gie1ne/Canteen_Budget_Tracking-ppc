const CACHE_NAME = 'canteen-tracker-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event - cache assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        // Some assets might not exist locally, that's fine
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - cache first, fallback to network
self.addEventListener('fetch', (e) => {
  // Skip non-GET requests
  if (e.request.method !== 'GET') return;

  // Network first for API calls, cache first for static assets
  if (e.request.url.includes('/api/')) {
    e.respondWith(networkFirst(e.request));
  } else {
    e.respondWith(cacheFirst(e.request));
  }
});

// Cache first strategy
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response(
      '<h1>Offline</h1><p>This resource is not available offline.</p>',
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({ 'Content-Type': 'text/html' })
      }
    );
  }
}

// Network first strategy
async function networkFirst(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const cache = await caches.open(CACHE_NAME);
    return cache.match(request) || new Response('Offline', { status: 503 });
  }
}

// Handle background sync (for future sync capabilities)
self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-meals') {
    e.waitUntil(syncMeals());
  }
});

async function syncMeals() {
  // This could sync data to a server when back online
  console.log('Syncing meals...');
}

// Handle push notifications (for future notification capabilities)
self.addEventListener('push', (e) => {
  const options = {
    body: e.data ? e.data.text() : 'Budget reminder!',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%2310b981" width="192" height="192"/><text x="50%" y="50%" font-size="80" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">₱</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><circle cx="48" cy="48" r="48" fill="%2310b981"/></svg>',
    tag: 'budget-notification',
    requireInteraction: false
  };

  e.waitUntil(self.registration.showNotification('Canteen Tracker', options));
});
