const CACHE_NAME = 'circles-v4';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './Circle.js',
  './collisions.js',
  './manifest.json',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.map(key => key !== CACHE_NAME && caches.delete(key)))
    )
  );
});

self.addEventListener('fetch', (e) => {
  // Fix for iOS PWA blank screen
  if (e.request.mode === 'navigate') {
    e.respondWith(caches.match('./index.html'));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});