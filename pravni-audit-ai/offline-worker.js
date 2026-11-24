'use strict';

// Only the public teaching materials belong here. No Firebase requests, names,
// answers, session credentials or teacher resources are stored in this cache.
const scopeUrl = new URL('./', self.location.href);
const cachePrefix = 'pravni-audit-ai-public-shell:' + scopeUrl.pathname + ':';
// npm run build updates this fingerprint when any public worksheet file changes.
const shellVersion = '229fe6c78a683c385de586ae8d2e8c7a';
const cacheName = cachePrefix + shellVersion;
const assets = [
  'index.html', 'classroom.css', 'learning.css', 'firebase-config.js',
  'firebase-store.js', 'classroom.js', 'learning-content.js', 'learning.js',
  'learning-assets/cover.jpg', 'learning-assets/cafe.jpg',
  ...Array.from({length:10}, (_, n) => 'photos/portrait-' + String(n + 1).padStart(2, '0') + '.jpg')
];
const publicUrls = new Set(assets.map(path => new URL(path, scopeUrl).href));
const documentUrl = new URL('index.html', scopeUrl).href;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll([...publicUrls].map(url => new Request(url, {cache:'reload', credentials:'omit'})));
    // Switch future navigations only after the whole release is available.
    // Open worksheets keep their current document and in-memory form.
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for(const name of await caches.keys()) {
      if(name.startsWith(cachePrefix) && name !== cacheName) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if(url.origin !== scopeUrl.origin) return;
  if(event.request.referrer.startsWith(new URL('ucitel/', scopeUrl).href)) return;
  url.search = '';
  url.hash = '';
  const key = url.href === scopeUrl.href ? documentUrl : url.href;
  if(!publicUrls.has(key)) return;
  event.respondWith((async () => {
    // A complete release was cached atomically during install. A failed
    // network request or a 503 from a school proxy cannot replace that shell.
    const cached = await (await caches.open(cacheName)).match(key);
    if (key !== documentUrl && cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response.status >= 400 && response.status < 500) return response;
      return cached || response;
    } catch (error) {
      if (cached) return cached;
      throw error;
    }
  })());
});
