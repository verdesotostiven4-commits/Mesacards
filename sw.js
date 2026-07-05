const CACHE_NAME = 'mesacards-v31';
const APP_SHELL = ['./','./index.html','./styles.css','./enhance.css','./pro-polish.css','./flow.css','./social.css','./luxury.css','./app.js','./enhance.js','./flow-guard.js','./pro-polish.js','./flow.js','./supabase-config.js','./social.js','./luxury-home.js','./luxury-online.js','./luxury-games.js','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))); self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))); self.clients.claim(); });
self.addEventListener('fetch', event => { if (event.request.method !== 'GET') return; event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html')))); });
